import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Request from '../../../../models/Request';
import { getCurrentUser } from '../../../../lib/auth';
import { RequestStatus } from '../../../../lib/types';

// SLA targets in hours
const SLA_TARGETS = {
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

    // Get all completed requests from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const requests = await Request.find({
      createdAt: { $gte: thirtyDaysAgo }
    }).lean();

    // Calculate SLA metrics
    const slaMetrics = {
      totalRequests: requests.length,
      withinSLA: 0,
      breachedSLA: 0,
      averageTurnaroundHours: 0,
      byStatus: {} as Record<string, any>,
      breachedRequests: [] as any[]
    };

    let totalHours = 0;

    for (const request of requests) {
      const history = request.history || [];
      
      // Calculate time spent at each status
      for (let i = 0; i < history.length - 1; i++) {
        const current = history[i];
        const next = history[i + 1];
        const status = current.newStatus;
        
        if (!status || !SLA_TARGETS[status]) continue;

        const timeSpent = (new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime()) / (1000 * 60 * 60);
        const slaTarget = SLA_TARGETS[status];
        
        if (!slaMetrics.byStatus[status]) {
          slaMetrics.byStatus[status] = {
            total: 0,
            withinSLA: 0,
            breached: 0,
            avgTime: 0,
            totalTime: 0
          };
        }

        slaMetrics.byStatus[status].total++;
        slaMetrics.byStatus[status].totalTime += timeSpent;

        if (timeSpent <= slaTarget) {
          slaMetrics.byStatus[status].withinSLA++;
          slaMetrics.withinSLA++;
        } else {
          slaMetrics.byStatus[status].breached++;
          slaMetrics.breachedSLA++;
          
          slaMetrics.breachedRequests.push({
            requestId: request.requestId,
            title: request.title,
            status,
            timeSpent: Math.round(timeSpent),
            slaTarget,
            breach: Math.round(timeSpent - slaTarget)
          });
        }
      }

      // Calculate total turnaround time
      if (request.status === RequestStatus.APPROVED || request.status === RequestStatus.REJECTED) {
        const turnaround = (new Date(request.updatedAt).getTime() - new Date(request.createdAt).getTime()) / (1000 * 60 * 60);
        totalHours += turnaround;
      }
    }

    // Calculate averages
    slaMetrics.averageTurnaroundHours = requests.length > 0 ? Math.round(totalHours / requests.length) : 0;

    for (const status in slaMetrics.byStatus) {
      const data = slaMetrics.byStatus[status];
      data.avgTime = Math.round(data.totalTime / data.total);
      data.slaCompliance = Math.round((data.withinSLA / data.total) * 100);
    }

    return NextResponse.json({
      success: true,
      metrics: slaMetrics,
      period: '30 days'
    });
  } catch (error) {
    console.error('SLA analytics error:', error);
    return NextResponse.json({
      error: 'Failed to fetch SLA metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
