import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Request from '../../../../models/Request';
import User from '../../../../models/User';
import Role from '../../../../models/Role';
import { getCurrentUser } from '../../../../lib/auth';
import { RequestStatus, ActionType } from '../../../../lib/types';

// SLA targets in hours
const SLA_TARGETS: Record<string, number> = {
  [RequestStatus.MANAGER_REVIEW]: 24,
  [RequestStatus.BUDGET_CHECK]: 48,
  [RequestStatus.VP_APPROVAL]: 72,
  [RequestStatus.HOI_APPROVAL]: 72,
  [RequestStatus.DEAN_REVIEW]: 48,
  [RequestStatus.DEPARTMENT_CHECKS]: 96,
  [RequestStatus.DEAN_VERIFICATION]: 24,
  [RequestStatus.CHIEF_DIRECTOR_APPROVAL]: 72,
  [RequestStatus.CHAIRMAN_APPROVAL]: 48,
};

export async function GET() {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const requests = await Request.find({}).lean();

    // Header KPIs
    let totalCompletedHours = 0;
    let completedCount = 0;
    let documentsPending = 0;
    let overdueCount = 0;
    let completedThisMonth = 0;
    let completedLastMonth = 0;

    const pipeline = {
      Draft: 0,
      Submitted: 0,
      UnderReview: 0,
      Approved: 0,
      Rejected: 0
    };

    const agingReport = [];
    const now = new Date().getTime();

    for (const request of requests) {
      const isCompleted = request.status === RequestStatus.APPROVED || request.status === RequestStatus.REJECTED;
      const createdAt = new Date(request.createdAt).getTime();
      const updatedAt = new Date(request.updatedAt).getTime();

      // Pipeline
      if (request.status === RequestStatus.SUBMITTED) pipeline.Submitted++;
      else if (request.status === RequestStatus.APPROVED) pipeline.Approved++;
      else if (request.status === RequestStatus.REJECTED) pipeline.Rejected++;
      else pipeline.UnderReview++;

      if (isCompleted) {
        if (createdAt >= thirtyDaysAgo.getTime()) {
          completedThisMonth++;
        } else if (createdAt >= sixtyDaysAgo.getTime() && createdAt < thirtyDaysAgo.getTime()) {
          completedLastMonth++;
        }
        totalCompletedHours += (updatedAt - createdAt) / (1000 * 60 * 60);
        completedCount++;
      } else {
        documentsPending++;

        let daysWaiting = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
        const hoursWaiting = (now - updatedAt) / (1000 * 60 * 60);

        let statusColor = 'green';
        const slaHours = SLA_TARGETS[request.status] || 48;

        if (hoursWaiting > slaHours) {
          statusColor = 'red';
          overdueCount++;
        } else if (hoursWaiting > slaHours * 0.75) {
          statusColor = 'amber';
        }

        agingReport.push({
          id: request._id,
          name: request.title,
          type: request.expenseCategory || request.requestType || 'General',
          status: statusColor,
          stage: request.status.replace(/_/g, ' '),
          daysWaiting: daysWaiting,
          approver: 'Pending'
        });
      }
    }

    const averageTurnaroundHours = completedCount > 0 ? Math.round(totalCompletedHours / completedCount) : 0;
    let momChange = 0;
    if (completedLastMonth > 0) {
      momChange = Math.round(((completedThisMonth - completedLastMonth) / completedLastMonth) * 100);
    } else if (completedThisMonth > 0) {
      momChange = 100;
    }

    // Forwarder Performance
    const forwardRoles = await Role.find({ 'permissions.canForward': true }).lean();
    const forwardRoleIds = forwardRoles.map(r => r._id);
    const forwarders = await User.find({ role: { $in: forwardRoleIds } }).select('name _id').lean();

    const forwarderPerformance = [];
    for (const f of forwarders) {
      let forwardedCount = 0;
      let totalResponseHours = 0;

      for (const req of requests) {
        if (!req.history) continue;
        let prevTimestamp = new Date(req.createdAt).getTime();
        for (const log of req.history) {
          const logTime = new Date(log.timestamp).getTime();
          if (log.action === ActionType.FORWARD && log.actor?.toString() === f._id.toString()) {
            if (logTime > thirtyDaysAgo.getTime()) {
              forwardedCount++;
            }
            totalResponseHours += (logTime - prevTimestamp) / (1000 * 60 * 60);
          }
          prevTimestamp = logTime;
        }
      }

      forwarderPerformance.push({
        id: f._id,
        name: f.name,
        docsProcessed: forwardedCount,
        avgResponse: forwardedCount > 0 ? Math.round(totalResponseHours / forwardedCount) : 0,
        queueSize: 0,
        slowest: false
      });
    }

    if (forwarderPerformance.length > 0) {
      let slowestVal = -1;
      let slowestIdx = -1;
      forwarderPerformance.forEach((fp, idx) => {
        if (fp.avgResponse > slowestVal && fp.docsProcessed > 0) {
          slowestVal = fp.avgResponse;
          slowestIdx = idx;
        }
      });
      if (slowestIdx > -1) {
        forwarderPerformance[slowestIdx].slowest = true;
      }
    }

    const slaTrend = [];
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (w * 7) - 7);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (w * 7));

      let weekTotal = 0;
      let weekWithinSLA = 0;

      for (const req of requests) {
        const createdAt = new Date(req.createdAt).getTime();
        const updatedAt = new Date(req.updatedAt).getTime();

        if (createdAt >= weekStart.getTime() && createdAt < weekEnd.getTime()) {
          weekTotal++;
          if ((updatedAt - createdAt) / (1000 * 60 * 60) < 48) {
            weekWithinSLA++;
          }
        }
      }
      slaTrend.push({
        week: `W${12 - w}`,
        compliance: weekTotal > 0 ? Math.round((weekWithinSLA / weekTotal) * 100) : 85
      });
    }

    return NextResponse.json({
      success: true,
      metrics: {
        averageTurnaroundHours,
        documentsPending,
        overdueCount,
        momChange,
        pipeline,
        agingReport,
        forwarderPerformance,
        slaTrend
      }
    });

  } catch (error) {
    console.error('SLA analytics error:', error);
    return NextResponse.json({
      error: 'Failed to fetch SLA metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
