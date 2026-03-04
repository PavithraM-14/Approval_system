import RetentionPolicy, { RetentionAction } from '../models/RetentionPolicy';
import Request from '../models/Request';
import { RequestStatus } from './types';
import { createAuditLog } from './audit-service';
import { AuditAction } from '../models/AuditLog';

/**
 * Check and apply retention policies to requests
 */
export async function applyRetentionPolicies() {
  const policies = await RetentionPolicy.find({ isActive: true });
  const now = new Date();
  const results = {
    archived: 0,
    deleted: 0,
    notified: 0,
    errors: 0,
  };

  for (const policy of policies) {
    try {
      const cutoffDate = new Date(now.getTime() - policy.retentionPeriodDays * 24 * 60 * 60 * 1000);
      
      // Find requests that match the policy and are older than retention period
      const query: any = {
        createdAt: { $lte: cutoffDate },
        status: { $in: [RequestStatus.APPROVED, RequestStatus.REJECTED] }, // Only apply to completed requests
      };

      if (policy.category) {
        query.expenseCategory = policy.category;
      }

      const affectedRequests = await Request.find(query);

      for (const request of affectedRequests) {
        switch (policy.action) {
          case RetentionAction.ARCHIVE:
            // Mark as archived (you can add an 'archived' field to Request model)
            await Request.findByIdAndUpdate(request._id, {
              $set: { archived: true, archivedAt: now },
            });
            results.archived++;
            
            await createAuditLog({
              action: AuditAction.REQUEST_VIEW,
              userId: policy.createdBy.toString(),
              targetType: 'request',
              targetId: request._id.toString(),
              details: { action: 'archived', policyId: policy._id, policyName: policy.name },
            });
            break;

          case RetentionAction.DELETE:
            // Soft delete (mark as deleted but keep in database)
            await Request.findByIdAndUpdate(request._id, {
              $set: { deleted: true, deletedAt: now },
            });
            results.deleted++;
            
            await createAuditLog({
              action: AuditAction.REQUEST_VIEW,
              userId: policy.createdBy.toString(),
              targetType: 'request',
              targetId: request._id.toString(),
              details: { action: 'deleted', policyId: policy._id, policyName: policy.name },
            });
            break;

          case RetentionAction.NOTIFY:
            // Send notification to relevant users
            // This would integrate with your notification system
            results.notified++;
            break;
        }
      }
    } catch (error) {
      console.error(`Error applying retention policy ${policy._id}:`, error);
      results.errors++;
    }
  }

  return results;
}

/**
 * Check for requests approaching retention deadline
 */
export async function checkUpcomingRetentions() {
  const policies = await RetentionPolicy.find({ isActive: true });
  const now = new Date();
  const upcomingRetentions = [];

  for (const policy of policies) {
    const notifyDate = new Date(now.getTime() - (policy.retentionPeriodDays - policy.notifyBeforeDays) * 24 * 60 * 60 * 1000);
    const cutoffDate = new Date(now.getTime() - policy.retentionPeriodDays * 24 * 60 * 60 * 1000);

    const query: any = {
      createdAt: { $gte: cutoffDate, $lte: notifyDate },
      status: { $in: [RequestStatus.APPROVED, RequestStatus.REJECTED] },
    };

    if (policy.category) {
      query.expenseCategory = policy.category;
    }

    const requests = await Request.find(query)
      .populate('requester', 'name email')
      .lean();

    if (requests.length > 0) {
      upcomingRetentions.push({
        policy: policy.name,
        action: policy.action,
        daysUntilAction: policy.notifyBeforeDays,
        affectedRequests: requests.length,
        requests: requests.map(r => ({
          id: r._id,
          title: r.title,
          requester: r.requester,
          createdAt: r.createdAt,
        })),
      });
    }
  }

  return upcomingRetentions;
}

/**
 * Create a new retention policy
 */
export async function createRetentionPolicy(policyData: {
  name: string;
  description?: string;
  documentType?: string;
  category?: string;
  retentionPeriodDays: number;
  action: RetentionAction;
  notifyBeforeDays?: number;
  createdBy: string;
}) {
  const policy = await RetentionPolicy.create(policyData);
  
  await createAuditLog({
    action: AuditAction.DOCUMENT_UPDATE,
    userId: policyData.createdBy,
    targetType: 'system',
    details: { action: 'retention_policy_created', policyId: policy._id, policyName: policy.name },
  });

  return policy;
}

/**
 * Get all retention policies
 */
export async function getRetentionPolicies(activeOnly: boolean = false) {
  const query = activeOnly ? { isActive: true } : {};
  return await RetentionPolicy.find(query)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
}

/**
 * Update retention policy
 */
export async function updateRetentionPolicy(
  policyId: string,
  updates: Partial<{
    name: string;
    description: string;
    retentionPeriodDays: number;
    action: RetentionAction;
    isActive: boolean;
    notifyBeforeDays: number;
  }>,
  updatedBy: string
) {
  const policy = await RetentionPolicy.findByIdAndUpdate(
    policyId,
    { $set: updates },
    { new: true }
  );

  await createAuditLog({
    action: AuditAction.DOCUMENT_UPDATE,
    userId: updatedBy,
    targetType: 'system',
    details: { action: 'retention_policy_updated', policyId, updates },
  });

  return policy;
}

/**
 * Delete retention policy
 */
export async function deleteRetentionPolicy(policyId: string, deletedBy: string) {
  await RetentionPolicy.findByIdAndDelete(policyId);

  await createAuditLog({
    action: AuditAction.DOCUMENT_DELETE,
    userId: deletedBy,
    targetType: 'system',
    details: { action: 'retention_policy_deleted', policyId },
  });

  return { success: true };
}
