import Notification from '../models/Notification';
import User from '../models/User';
import Request from '../models/Request';
import { RequestStatus } from './types';
import nodemailer from 'nodemailer';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'SRM Approval System';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Email transporter setup
const createEmailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('Email credentials not configured. Notifications will be in-app only.');
    return null;
  }

  // nodemailer uses `createTransport`, not createTransporter
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

interface NotificationData {
  userId: string;
  requestId: string;
  type: 'approval_pending' | 'approval_approved' | 'approval_rejected' | 'query_received' | 'query_responded' | 'request_created' | 'request_completed';
  title: string;
  message: string;
  metadata?: {
    requestTitle?: string;
    requestId?: string;
    actorName?: string;
    actorRole?: string;
    status?: string;
  };
}

/**
 * Create an in-app notification
 */
export async function createNotification(data: NotificationData) {
  try {
    const notification = await Notification.create({
      userId: data.userId,
      requestId: data.requestId,
      type: data.type,
      title: data.title,
      message: data.message,
      actionUrl: `/dashboard/requests/${data.requestId}`,
      metadata: data.metadata,
      read: false,
    });

    console.log('✅ Notification created:', {
      notificationId: notification._id,
      userId: data.userId,
      type: data.type,
    });

    return notification;
  } catch (error) {
    console.error('❌ Failed to create notification:', error);
    throw error;
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(
  email: string,
  name: string,
  subject: string,
  html: string,
  text: string
) {
  const transporter = createEmailTransporter();
  
  if (!transporter) {
    console.log('⚠️ Email not sent - transporter not configured');
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
      text,
    });

    console.log('✅ Email notification sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email notification:', error);
    return false;
  }
}

/**
 * Generate email HTML template
 */
function generateEmailTemplate(
  title: string,
  message: string,
  actionUrl: string,
  actionText: string,
  color: string = '#2563eb'
) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
          color: white; 
          padding: 30px 20px; 
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content { 
          padding: 40px 30px;
        }
        .content p {
          margin: 0 0 15px 0;
          color: #4b5563;
        }
        .message-box {
          background-color: #f9fafb;
          border-left: 4px solid ${color};
          padding: 16px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .action-button {
          display: inline-block;
          padding: 12px 24px;
          background-color: ${color};
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .footer { 
          text-align: center; 
          padding: 20px 30px;
          background-color: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 5px 0;
          font-size: 12px; 
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
        </div>
        <div class="content">
          <div class="message-box">
            <p>${message}</p>
          </div>
          <p style="text-align: center;">
            <a href="${actionUrl}" class="action-button">${actionText}</a>
          </p>
          <p style="font-size: 12px; color: #6b7280;">
            Or copy this link: <a href="${actionUrl}">${actionUrl}</a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated notification from ${APP_NAME}.</p>
          <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate an email template containing two action buttons (e.g. approve/reject).
 */
function generateEmailWithTwoActions(
  title: string,
  message: string,
  action1Url: string,
  action1Text: string,
  action1Color: string,
  action2Url: string,
  action2Text: string,
  action2Color: string
) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, ${action1Color} 0%, ${action1Color}dd 100%);
          color: white; 
          padding: 30px 20px; 
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content { 
          padding: 40px 30px;
        }
        .content p {
          margin: 0 0 15px 0;
          color: #4b5563;
        }
        .message-box {
          background-color: #f9fafb;
          border-left: 4px solid ${action1Color};
          padding: 16px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .actions {
          text-align: center;
          margin: 20px 0;
        }
        .action-button {
          display: inline-block;
          padding: 12px 24px;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 0 8px;
        }
        .button1 { background-color: ${action1Color}; }
        .button2 { background-color: ${action2Color}; }
        .footer { 
          text-align: center; 
          padding: 20px 30px;
          background-color: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 5px 0;
          font-size: 12px; 
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
        </div>
        <div class="content">
          <div class="message-box">
            <p>${message}</p>
          </div>
          <div class="actions">
            <a href="${action1Url}" class="action-button button1">${action1Text}</a>
            <a href="${action2Url}" class="action-button button2">${action2Text}</a>
          </div>
          <p style="font-size: 12px; color: #6b7280;">
            Or copy links:
            <br/>
            <a href="${action1Url}">${action1Text}</a> | <a href="${action2Url}">${action2Text}</a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated notification from ${APP_NAME}.</p>
          <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Notify user about pending approval
 */
export async function notifyApprovalPending(
  userId: string,
  requestId: string,
  requestTitle: string,
  requestorName: string
) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found:', userId);
      return;
    }

    const title = 'New Approval Request';
    const message = `${requestorName} has submitted "${requestTitle}" for your approval.`;

    // Create in-app notification
    await createNotification({
      userId,
      requestId,
      type: 'approval_pending',
      title,
      message,
      metadata: {
        requestTitle,
        requestId,
        actorName: requestorName,
      },
    });

    // Send email notification with direct action buttons
    const viewUrl = `${BASE_URL}/dashboard/requests/${requestId}`;
    const approveUrl = `${viewUrl}?action=approve`;
    const rejectUrl = `${viewUrl}?action=reject`;

    const html = generateEmailWithTwoActions(
      title,
      message,
      approveUrl,
      'Approve',
      '#10b981', // green
      rejectUrl,
      'Reject',
      '#ef4444'  // red
    );

    const text = `${title}\n\n${message}\n\nApprove: ${approveUrl}\nReject: ${rejectUrl}\n\nView request: ${viewUrl}`;

    await sendEmailNotification(user.email, user.name, title, html, text);
  } catch (error) {
    console.error('Failed to send approval pending notification:', error);
  }
}

/**
 * Notify requester about approval
 */
export async function notifyApprovalApproved(
  requesterId: string,
  requestId: string,
  requestTitle: string,
  approverName: string,
  approverRole: string
) {
  try {
    const user = await User.findById(requesterId);
    if (!user) return;

    const title = 'Request Approved';
    const message = `Your request "${requestTitle}" has been approved by ${approverName} (${approverRole}).`;

    await createNotification({
      userId: requesterId,
      requestId,
      type: 'approval_approved',
      title,
      message,
      metadata: {
        requestTitle,
        actorName: approverName,
        actorRole: approverRole,
      },
    });

    const actionUrl = `${BASE_URL}/dashboard/requests/${requestId}`;
    const html = generateEmailTemplate(
      title,
      message,
      actionUrl,
      'View Request',
      '#10b981'
    );
    const text = `${title}\n\n${message}\n\nView request: ${actionUrl}`;

    await sendEmailNotification(user.email, user.name, title, html, text);
  } catch (error) {
    console.error('Failed to send approval approved notification:', error);
  }
}

/**
 * Notify requester about rejection
 */
export async function notifyApprovalRejected(
  requesterId: string,
  requestId: string,
  requestTitle: string,
  rejectorName: string,
  rejectorRole: string,
  reason?: string
) {
  try {
    const user = await User.findById(requesterId);
    if (!user) return;

    const title = 'Request Rejected';
    const message = `Your request "${requestTitle}" has been rejected by ${rejectorName} (${rejectorRole}).${reason ? ` Reason: ${reason}` : ''}`;

    await createNotification({
      userId: requesterId,
      requestId,
      type: 'approval_rejected',
      title,
      message,
      metadata: {
        requestTitle,
        actorName: rejectorName,
        actorRole: rejectorRole,
      },
    });

    const actionUrl = `${BASE_URL}/dashboard/requests/${requestId}`;
    const html = generateEmailTemplate(
      title,
      message,
      actionUrl,
      'View Request',
      '#ef4444'
    );
    const text = `${title}\n\n${message}\n\nView request: ${actionUrl}`;

    await sendEmailNotification(user.email, user.name, title, html, text);
  } catch (error) {
    console.error('Failed to send approval rejected notification:', error);
  }
}

/**
 * Notify about query/clarification request
 */
export async function notifyQueryReceived(
  targetUserId: string,
  requestId: string,
  requestTitle: string,
  senderName: string,
  queryMessage: string
) {
  try {
    const user = await User.findById(targetUserId);
    if (!user) return;

    const title = 'Clarification Requested';
    const message = `${senderName} has requested clarification on "${requestTitle}": ${queryMessage}`;

    await createNotification({
      userId: targetUserId,
      requestId,
      type: 'query_received',
      title,
      message,
      metadata: {
        requestTitle,
        actorName: senderName,
      },
    });

    const actionUrl = `${BASE_URL}/dashboard/requests/${requestId}`;
    const html = generateEmailTemplate(
      title,
      message,
      actionUrl,
      'Respond to Query',
      '#f59e0b'
    );
    const text = `${title}\n\n${message}\n\nRespond: ${actionUrl}`;

    await sendEmailNotification(user.email, user.name, title, html, text);
  } catch (error) {
    console.error('Failed to send query notification:', error);
  }
}

/**
 * Notify when request is completed
 */
export async function notifyApprovalReminder(
  approverId: string,
  requestId: string,
  requestTitle: string,
  daysPending: number
) {
  try {
    const user = await User.findById(approverId);
    if (!user) return;

    const title = 'Reminder: Approval Pending';
    const message = `You have had "${requestTitle}" in your queue for ${daysPending} day${daysPending !== 1 ? 's' : ''}. Please review it when you get a moment.`;

    // create an in-app reminder as well
    await createNotification({
      userId: approverId,
      requestId,
      type: 'approval_pending',
      title,
      message,
      metadata: {
        requestTitle,
      },
    });

    const actionUrl = `${BASE_URL}/dashboard/requests/${requestId}`;
    const html = generateEmailTemplate(
      title,
      message,
      actionUrl,
      'Review Request',
      '#2563eb'
    );
    const text = `${title}\n\n${message}\n\nReview: ${actionUrl}`;

    await sendEmailNotification(user.email, user.name, title, html, text);
  } catch (error) {
    console.error('Failed to send approval reminder:', error);
  }
}


export async function notifyRequestCompleted(
  requesterId: string,
  requestId: string,
  requestTitle: string,
  finalStatus: string
) {
  try {
    const user = await User.findById(requesterId);
    if (!user) return;

    const title = 'Request Completed';
    const message = `Your request "${requestTitle}" has been ${finalStatus}.`;

    await createNotification({
      userId: requesterId,
      requestId,
      type: 'request_completed',
      title,
      message,
      metadata: {
        requestTitle,
        status: finalStatus,
      },
    });

    const actionUrl = `${BASE_URL}/dashboard/requests/${requestId}`;
    const color = finalStatus === 'approved' ? '#10b981' : '#ef4444';
    const html = generateEmailTemplate(
      title,
      message,
      actionUrl,
      'View Request',
      color
    );
    const text = `${title}\n\n${message}\n\nView request: ${actionUrl}`;

    await sendEmailNotification(user.email, user.name, title, html, text);
  } catch (error) {
    console.error('Failed to send completion notification:', error);
  }
}

/**
 * Get next approver(s) based on current status
 */
export async function getNextApprovers(requestId: string, newStatus: string): Promise<string[]> {
  const request = await Request.findById(requestId).populate('requester');
  if (!request) return [];

  const approverIds: string[] = [];

  // Map status to role.  Any status that represents the *next* approval
  // step should be included here so the appropriate users receive an email.
  // Most statuses correspond exactly to roles, but department_checks requires
  // special handling (see below) and parallel_verification needs both SOP and
  // accountant.
  const statusToRole: Record<string, string> = {
    'manager_review': 'institution_manager',
    'parallel_verification': 'sop_verifier', // Will also notify accountant
    'sop_completed': 'accountant',           // if accountant not already notified
    'budget_completed': 'sop_verifier',     // vice‑versa for SOP verifier
    'institution_verified': 'institution_manager', // after parallel paths
    'vp_approval': 'vp',
    'hoi_approval': 'head_of_institution',
    'dean_review': 'dean',
    // department_checks is dealt with dynamically below
    'chief_director_approval': 'chief_director',
    'chairman_approval': 'chairman',
  };

  // handle department checks specially by looking at the most recent
  // clarification entry which stores the target department in queryTarget
  if (newStatus === RequestStatus.DEPARTMENT_CHECKS) {
    const latestClarification = request.history
      ?.filter((h: any) => h.queryTarget)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (latestClarification && latestClarification.queryTarget) {
      const deptRole = latestClarification.queryTarget.toLowerCase();
      const deptUsers = await User.find({ role: deptRole, isActive: true });
      approverIds.push(...deptUsers.map(u => u._id.toString()));
    } else {
      // fallback to MMA if we can't determine a target
      const mmaUsers = await User.find({ role: 'mma', isActive: true });
      approverIds.push(...mmaUsers.map(u => u._id.toString()));
    }
    return approverIds;
  }

  const targetRole = statusToRole[newStatus];
  if (targetRole) {
    // Find users with the mapped role
    const approvers = await User.find({ role: targetRole, isActive: true });
    approverIds.push(...approvers.map(u => u._id.toString()));
  }

  // Special cases
  if (newStatus === RequestStatus.PARALLEL_VERIFICATION) {
    const accountants = await User.find({ role: 'accountant', isActive: true });
    approverIds.push(...accountants.map(u => u._id.toString()));
  }

  return approverIds;

  return approverIds;
}

// ------------------------------------------------------------
// Scheduled reminder logic (runs automatically whenever the module
// is loaded in a long‑running server process, e.g. during development
// or on a persistent deployment). It uses the same threshold defined
// in scripts/sendReminders.ts but can be controlled via env var.

let reminderIntervalStarted = false;

export function startReminderScheduler(intervalMs: number = 24 * 60 * 60 * 1000) {
  if (reminderIntervalStarted) return;
  reminderIntervalStarted = true;

  const days = Number(process.env.REMINDER_DAYS || '3');
  const thresholdMs = days * 24 * 60 * 60 * 1000;
  const pendingStatuses = [
    RequestStatus.MANAGER_REVIEW,
    RequestStatus.PARALLEL_VERIFICATION,
    RequestStatus.SOP_COMPLETED,
    RequestStatus.BUDGET_COMPLETED,
    RequestStatus.INSTITUTION_VERIFIED,
    RequestStatus.VP_APPROVAL,
    RequestStatus.HOI_APPROVAL,
    RequestStatus.DEAN_REVIEW,
    RequestStatus.DEPARTMENT_CHECKS,
    RequestStatus.CHIEF_DIRECTOR_APPROVAL,
    RequestStatus.CHAIRMAN_APPROVAL,
  ];

  const runCheck = async () => {
    try {
      const now = new Date();
      const stale = await Request.find({ status: { $in: pendingStatuses } });
      for (const req of stale) {
        if (!req.history || req.history.length === 0) continue;
        const lastEntry = req.history
          .filter((h: any) => h.newStatus === req.status)
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        if (!lastEntry) continue;
        const age = now.getTime() - new Date(lastEntry.timestamp).getTime();
        if (age < thresholdMs) continue;
        const approvers = await getNextApprovers(req._id.toString(), req.status);
        for (const id of approvers) {
          await notifyApprovalReminder(
            id,
            req._id.toString(),
            req.title,
            Math.floor(age / (24 * 60 * 60 * 1000))
          );
        }
      }
      console.log('[REMINDER] checked for stale approvals');
    } catch (error) {
      console.error('[REMINDER] error during scheduled check:', error);
    }
  };

  // run once immediately, then on interval
  runCheck().catch(console.error);
  setInterval(runCheck, intervalMs);
}

// start scheduler on module import
startReminderScheduler();

/**
 * Send notifications to all stakeholders when request status changes
 */
export async function notifyStatusChange(
  requestId: string,
  newStatus: string,
  actorId: string,
  action: 'approve' | 'reject' | 'clarify',
  notes?: string
) {
  try {
    const request = await Request.findById(requestId).populate('requester');
    const actor = await User.findById(actorId);
    
    if (!request || !actor) return;

    // Notify requester about status change
    if (action === 'approve') {
      await notifyApprovalApproved(
        request.requester._id.toString(),
        requestId,
        request.title,
        actor.name,
        actor.role
      );
    } else if (action === 'reject') {
      await notifyApprovalRejected(
        request.requester._id.toString(),
        requestId,
        request.title,
        actor.name,
        actor.role,
        notes
      );
    }

    // Notify next approvers if request is moving forward
    if (action === 'approve' && newStatus !== 'approved') {
      const nextApprovers = await getNextApprovers(requestId, newStatus);
      
      for (const approverId of nextApprovers) {
        await notifyApprovalPending(
          approverId,
          requestId,
          request.title,
          request.requester.name
        );
      }
    }

    // Notify when request is completed
    if (newStatus === 'approved' || newStatus === 'rejected') {
      await notifyRequestCompleted(
        request.requester._id.toString(),
        requestId,
        request.title,
        newStatus
      );
    }
  } catch (error) {
    console.error('Failed to send status change notifications:', error);
  }
}
