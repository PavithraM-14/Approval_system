import connectDB from '../lib/mongodb';
import Request from '../models/Request';
import { RequestStatus } from '../lib/types';
import { getNextApprovers, notifyApprovalReminder } from '../lib/notification-service';

/**
 * This script is intended to be run periodically (cron, scheduled task, etc.).
 * It finds approval requests that have been sitting in a pending status for
 * longer than the configured threshold (default 3 days) and sends reminder
 * emails to the approver(s) who should act on them.
 *
 * Usage: `node scripts/sendReminders.ts` (make sure the environment variables
 * for the database and email are loaded first).
 */

async function run() {
  await connectDB();

  const now = new Date();
  const thresholdMs = 3 * 24 * 60 * 60 * 1000; // 3 days

  // fetch requests that are still pending (not approved/rejected) and whose
  // last history entry moved them into that status more than threshold ago
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

  const staleRequests = await Request.find({
    status: { $in: pendingStatuses }
  });

  for (const req of staleRequests) {
    if (!req.history || req.history.length === 0) continue;

    // get latest history entry that changed status
    const lastEntry = req.history
      .filter((h: any) => h.newStatus === req.status)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (!lastEntry) continue;
    const age = now.getTime() - new Date(lastEntry.timestamp).getTime();
    if (age < thresholdMs) continue;

    // Check if a reminder was already sent today
    if (req.lastReminderSent) {
      const lastReminderDate = new Date(req.lastReminderSent);
      const hoursSinceLastReminder = (now.getTime() - lastReminderDate.getTime()) / (60 * 60 * 1000);
      
      // Only send one reminder per day (24 hours)
      if (hoursSinceLastReminder < 24) {
        console.log(`Skipping reminder for request ${req.requestId} - already sent ${Math.floor(hoursSinceLastReminder)} hours ago`);
        continue;
      }
    }

    // determine approvers for current status
    const approverIds = await getNextApprovers(req._id.toString(), req.status);
    for (const approverId of approverIds) {
      await notifyApprovalReminder(
        approverId,
        req._id.toString(),
        req.title,
        Math.floor(age / (24 * 60 * 60 * 1000))
      );
    }

    // Update the lastReminderSent timestamp
    await Request.findByIdAndUpdate(req._id, {
      lastReminderSent: now
    });
    
    console.log(`Sent reminder for request ${req.requestId} (pending for ${Math.floor(age / (24 * 60 * 60 * 1000))} days)`);
  }

  console.log(`Reminder run complete at ${new Date().toISOString()}`);
  process.exit(0);
}

run().catch(err => {
  console.error('Reminder script failed', err);
  process.exit(1);
});
