import connectDB from './mongodb';
import Request from '../models/Request';
import User from '../models/User';
import { sendEmail } from './email';
import { RequestStatus, UserRole } from './types';

interface EscalationRule {
  status: RequestStatus;
  hoursBeforeEscalation: number;
  escalateTo: UserRole[];
}

const ESCALATION_RULES: EscalationRule[] = [
  { status: RequestStatus.MANAGER_REVIEW, hoursBeforeEscalation: 24, escalateTo: [UserRole.VP] },
  { status: RequestStatus.BUDGET_CHECK, hoursBeforeEscalation: 48, escalateTo: [UserRole.VP] },
  { status: RequestStatus.VP_APPROVAL, hoursBeforeEscalation: 72, escalateTo: [UserRole.HEAD_OF_INSTITUTION] },
  { status: RequestStatus.HOI_APPROVAL, hoursBeforeEscalation: 72, escalateTo: [UserRole.DEAN] },
  { status: RequestStatus.DEAN_REVIEW, hoursBeforeEscalation: 48, escalateTo: [UserRole.CHIEF_DIRECTOR] },
];

export async function checkAndEscalateRequests() {
  try {
    await connectDB();
    
    const now = new Date();
    const escalatedRequests = [];

    for (const rule of ESCALATION_RULES) {
      const cutoffTime = new Date(now.getTime() - rule.hoursBeforeEscalation * 60 * 60 * 1000);
      
      // Find requests stuck at this status
      const stuckRequests = await Request.find({
        status: rule.status,
        updatedAt: { $lt: cutoffTime },
        escalated: { $ne: true }
      }).populate('requester', 'name email');

      for (const request of stuckRequests) {
        // Send escalation emails
        for (const role of rule.escalateTo) {
          const escalationUsers = await User.find({ role, isActive: true });
          
          for (const user of escalationUsers) {
            await sendEmail({
              toEmail: user.email,
              toName: user.name,
              subject: `⚠️ ESCALATION: Request #${request.requestId} Requires Attention`,
              html: `
                <h2>Escalated Request</h2>
                <p>The following request has been pending for over ${rule.hoursBeforeEscalation} hours:</p>
                <ul>
                  <li><strong>Request ID:</strong> ${request.requestId}</li>
                  <li><strong>Title:</strong> ${request.title}</li>
                  <li><strong>Requester:</strong> ${request.requester.name}</li>
                  <li><strong>Status:</strong> ${request.status}</li>
                  <li><strong>Pending Since:</strong> ${request.updatedAt.toLocaleString()}</li>
                </ul>
                <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/requests/${request._id}">View Request</a></p>
              `,
              text: `Escalated Request #${request.requestId} requires your attention.`
            });
          }
        }

        // Mark as escalated
        request.escalated = true;
        await request.save();
        escalatedRequests.push(request.requestId);
      }
    }

    return { success: true, escalated: escalatedRequests.length };
  } catch (error) {
    console.error('Escalation check failed:', error);
    return { success: false, error };
  }
}

export async function sendDailyReminders() {
  try {
    await connectDB();
    
    // Find all pending requests
    const pendingRequests = await Request.find({
      status: { $nin: [RequestStatus.APPROVED, RequestStatus.REJECTED] }
    }).populate('requester', 'name email');

    // Group by current approver role
    const remindersByRole: Record<string, any[]> = {};

    for (const request of pendingRequests) {
      const currentApproverRole = getCurrentApproverRole(request.status);
      if (!remindersByRole[currentApproverRole]) {
        remindersByRole[currentApproverRole] = [];
      }
      remindersByRole[currentApproverRole].push(request);
    }

    // Send reminders to each role
    for (const [role, requests] of Object.entries(remindersByRole)) {
      const users = await User.find({ role, isActive: true });
      
      for (const user of users) {
        await sendEmail({
          toEmail: user.email,
          toName: user.name,
          subject: `📋 Daily Reminder: ${requests.length} Pending Approvals`,
          html: `
            <h2>Pending Approvals</h2>
            <p>You have ${requests.length} request(s) awaiting your approval:</p>
            <ul>
              ${requests.map(r => `
                <li>
                  <strong>${r.requestId}</strong> - ${r.title} 
                  (${r.requester.name}, ${Math.floor((Date.now() - r.updatedAt.getTime()) / (1000 * 60 * 60))}h ago)
                </li>
              `).join('')}
            </ul>
            <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/approvals">View All Pending</a></p>
          `,
          text: `You have ${requests.length} pending approvals.`
        });
      }
    }

    return { success: true, reminders: Object.keys(remindersByRole).length };
  } catch (error) {
    console.error('Daily reminders failed:', error);
    return { success: false, error };
  }
}

function getCurrentApproverRole(status: RequestStatus): string {
  const roleMap: Partial<Record<RequestStatus, string>> = {
    [RequestStatus.MANAGER_REVIEW]: UserRole.INSTITUTION_MANAGER,
    [RequestStatus.BUDGET_CHECK]: UserRole.ACCOUNTANT,
    [RequestStatus.VP_APPROVAL]: UserRole.VP,
    [RequestStatus.HOI_APPROVAL]: UserRole.HEAD_OF_INSTITUTION,
    [RequestStatus.DEAN_REVIEW]: UserRole.DEAN,
    [RequestStatus.DEPARTMENT_CHECKS]: 'DEPARTMENT_HEADS',
    [RequestStatus.DEAN_VERIFICATION]: UserRole.DEAN,
    [RequestStatus.CHIEF_DIRECTOR_APPROVAL]: UserRole.CHIEF_DIRECTOR,
    [RequestStatus.CHAIRMAN_APPROVAL]: UserRole.CHAIRMAN,
  };
  return roleMap[status] || 'UNKNOWN';
}
