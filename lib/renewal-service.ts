/**
 * Automatic Renewal Service
 * Handles automatic creation of renewal requests
 */

import connectDB from './mongodb';
import Request from '../models/Request';
import { RequestStatus } from './types';
import { sendEmail } from './email';

/**
 * Generate a unique 6-digit request ID
 */
function generateRequestId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Calculate renewal date based on approval date and renewal period
 */
export function calculateRenewalDate(
  approvalDate: Date,
  renewalPeriod: number,
  renewalPeriodUnit: 'days' | 'months' | 'years'
): Date {
  const renewalDate = new Date(approvalDate);

  switch (renewalPeriodUnit) {
    case 'days':
      renewalDate.setDate(renewalDate.getDate() + renewalPeriod);
      break;
    case 'months':
      renewalDate.setMonth(renewalDate.getMonth() + renewalPeriod);
      break;
    case 'years':
      renewalDate.setFullYear(renewalDate.getFullYear() + renewalPeriod);
      break;
  }

  return renewalDate;
}

/**
 * Set renewal date when a renewal request is approved
 */
export async function setRenewalDate(requestId: string): Promise<void> {
  await connectDB();

  const request = await Request.findById(requestId);
  if (!request) {
    throw new Error('Request not found');
  }

  if (request.requestType !== 'renewal') {
    return; // Not a renewal request
  }

  if (!request.renewalPeriod || !request.renewalPeriodUnit) {
    throw new Error('Renewal period not specified');
  }

  // Calculate renewal date from approval date (now)
  const renewalDate = calculateRenewalDate(
    new Date(),
    request.renewalPeriod,
    request.renewalPeriodUnit
  );

  await Request.findByIdAndUpdate(requestId, {
    $set: { renewalDate },
  });

  console.log(`Renewal date set for request ${request.requestId}: ${renewalDate.toISOString()}`);
}

/**
 * Create a new renewal request based on an existing approved request
 */
export async function createRenewalRequest(originalRequestId: string): Promise<any> {
  await connectDB();

  const originalRequest = await Request.findById(originalRequestId).populate('requester');
  if (!originalRequest) {
    throw new Error('Original request not found');
  }

  // Generate new request ID
  let newRequestId = generateRequestId();
  let exists = await Request.findOne({ requestId: newRequestId });
  
  while (exists) {
    newRequestId = generateRequestId();
    exists = await Request.findOne({ requestId: newRequestId });
  }

  // Create new request with same details
  const newRequest = await Request.create({
    requestId: newRequestId,
    title: `${originalRequest.title} (Renewal)`,
    purpose: originalRequest.purpose,
    college: originalRequest.college,
    department: originalRequest.department,
    costEstimate: originalRequest.costEstimate,
    expenseCategory: originalRequest.expenseCategory,
    requestType: 'renewal',
    renewalPeriod: originalRequest.renewalPeriod,
    renewalPeriodUnit: originalRequest.renewalPeriodUnit,
    sopReference: originalRequest.sopReference,
    attachments: originalRequest.attachments,
    requester: originalRequest.requester._id,
    status: RequestStatus.SUBMITTED,
    parentRequestId: originalRequest.requestId,
    isRenewalGenerated: true,
  });

  // Mark original request as renewed
  await Request.findByIdAndUpdate(originalRequestId, {
    $set: { isRenewalGenerated: true },
  });

  console.log(`Created renewal request ${newRequest.requestId} from ${originalRequest.requestId}`);

  // Send notification to requester
  try {
    await sendEmail({
      toEmail: originalRequest.requester.email,
      toName: originalRequest.requester.name,
      subject: `Renewal Request Created: ${newRequest.requestId}`,
      text: `A renewal request has been automatically created: ${newRequest.requestId}`,
      html: `
        <h2>Automatic Renewal Request Created</h2>
        <p>Dear ${originalRequest.requester.name},</p>
        <p>A renewal request has been automatically created based on your approved request.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>New Request ID:</strong> ${newRequest.requestId}</p>
          <p><strong>Original Request ID:</strong> ${originalRequest.requestId}</p>
          <p><strong>Title:</strong> ${newRequest.title}</p>
          <p><strong>Status:</strong> Submitted</p>
        </div>
        
        <p>The new request will go through the complete approval process.</p>
        <p>You can track its progress in the dashboard.</p>
        
        <p>Best regards,<br>S.E.A.D. System</p>
      `,
    });
  } catch (emailError) {
    console.error('Failed to send renewal notification email:', emailError);
  }

  return newRequest;
}

/**
 * Check for requests that need renewal and create them
 */
export async function processRenewals(): Promise<{
  processed: number;
  created: number;
  errors: string[];
}> {
  await connectDB();

  const now = new Date();
  const errors: string[] = [];
  let processed = 0;
  let created = 0;

  try {
    // Find approved renewal requests that are due for renewal
    const dueRequests = await Request.find({
      requestType: 'renewal',
      status: RequestStatus.APPROVED,
      renewalDate: { $lte: now },
      isRenewalGenerated: { $ne: true }, // Not already renewed
    }).populate('requester');

    console.log(`Found ${dueRequests.length} requests due for renewal`);

    for (const request of dueRequests) {
      try {
        processed++;
        await createRenewalRequest(request._id.toString());
        created++;
      } catch (error) {
        const errorMsg = `Failed to create renewal for ${request.requestId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return { processed, created, errors };
  } catch (error) {
    console.error('Error processing renewals:', error);
    throw error;
  }
}
