import connectDB from './mongodb';
import Document from '../models/Document';
import RetentionPolicy from '../models/RetentionPolicy';
import AuditLog from '../models/AuditLog';

/**
 * Check and apply retention policies to documents
 * This should be run daily via cron job
 */
export async function applyRetentionPolicies() {
  try {
    await connectDB();
    
    const now = new Date();
    const results = {
      archived: 0,
      deleted: 0,
      flaggedForReview: 0,
      errors: [] as string[]
    };

    // Get all active retention policies
    const policies = await RetentionPolicy.find({ isActive: true });

    for (const policy of policies) {
      try {
        // Calculate cutoff date based on retention period
        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - policy.retentionPeriodYears);

        // Find documents that match this policy and are past retention period
        const expiredDocuments = await Document.find({
          documentType: policy.documentType,
          createdAt: { $lt: cutoffDate },
          status: { $ne: 'deleted' }, // Don't process already deleted docs
          retentionApplied: { $ne: true } // Don't reprocess
        });

        console.log(`[Retention] Found ${expiredDocuments.length} expired documents for policy: ${policy.name}`);

        for (const doc of expiredDocuments) {
          switch (policy.action) {
            case 'archive':
              // Mark as archived
              doc.status = 'archived';
              doc.retentionApplied = true;
              await doc.save();
              results.archived++;
              
              // Log the action
              await AuditLog.create({
                action: 'document_archived',
                userId: policy.createdBy,
                targetType: 'document',
                targetId: doc._id,
                details: {
                  reason: 'Retention policy applied',
                  policyName: policy.name,
                  retentionPeriod: policy.retentionPeriodYears
                }
              });
              break;

            case 'delete':
              // Soft delete
              doc.status = 'deleted';
              doc.retentionApplied = true;
              await doc.save();
              results.deleted++;
              
              await AuditLog.create({
                action: 'document_deleted',
                userId: policy.createdBy,
                targetType: 'document',
                targetId: doc._id,
                details: {
                  reason: 'Retention policy applied',
                  policyName: policy.name,
                  retentionPeriod: policy.retentionPeriodYears
                }
              });
              break;

            case 'review':
              // Flag for manual review
              doc.requiresReview = true;
              doc.reviewReason = `Retention period of ${policy.retentionPeriodYears} years expired`;
              await doc.save();
              results.flaggedForReview++;
              break;
          }
        }
      } catch (error) {
        console.error(`[Retention] Error processing policy ${policy.name}:`, error);
        results.errors.push(`Policy ${policy.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('[Retention] Policy application complete:', results);
    return { success: true, results };
  } catch (error) {
    console.error('[Retention] Failed to apply retention policies:', error);
    return { success: false, error };
  }
}

/**
 * Get documents expiring soon (within 30 days)
 */
export async function getExpiringDocuments(daysAhead: number = 30) {
  try {
    await connectDB();
    
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const policies = await RetentionPolicy.find({ isActive: true });
    const expiringDocs = [];

    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - policy.retentionPeriodYears);
      
      const futureCutoff = new Date();
      futureCutoff.setFullYear(futureCutoff.getFullYear() - policy.retentionPeriodYears);
      futureCutoff.setDate(futureCutoff.getDate() + daysAhead);

      const docs = await Document.find({
        documentType: policy.documentType,
        createdAt: { $gte: cutoffDate, $lt: futureCutoff },
        status: { $nin: ['deleted', 'archived'] }
      }).populate('uploadedBy', 'name email');

      expiringDocs.push(...docs.map(doc => ({
        ...doc.toObject(),
        policyName: policy.name,
        action: policy.action,
        daysUntilExpiry: Math.ceil((futureCutoff.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      })));
    }

    return expiringDocs;
  } catch (error) {
    console.error('[Retention] Failed to get expiring documents:', error);
    return [];
  }
}

/**
 * Create default retention policies
 */
export async function createDefaultPolicies(adminUserId: string) {
  try {
    await connectDB();

    const defaultPolicies = [
      {
        name: 'Financial Documents - 7 Years',
        description: 'Financial records must be retained for 7 years as per tax regulations',
        documentType: 'financial',
        retentionPeriodYears: 7,
        action: 'archive',
        createdBy: adminUserId
      },
      {
        name: 'HR Documents - 5 Years',
        description: 'Employee records retained for 5 years after employment ends',
        documentType: 'hr',
        retentionPeriodYears: 5,
        action: 'archive',
        createdBy: adminUserId
      },
      {
        name: 'Contracts - 10 Years',
        description: 'Legal contracts retained for 10 years after expiration',
        documentType: 'contract',
        retentionPeriodYears: 10,
        action: 'archive',
        createdBy: adminUserId
      },
      {
        name: 'Invoices - 7 Years',
        description: 'Invoice records for tax and audit purposes',
        documentType: 'invoice',
        retentionPeriodYears: 7,
        action: 'archive',
        createdBy: adminUserId
      },
      {
        name: 'General Documents - 3 Years',
        description: 'General business documents',
        documentType: 'general',
        retentionPeriodYears: 3,
        action: 'review',
        createdBy: adminUserId
      }
    ];

    for (const policy of defaultPolicies) {
      const existing = await RetentionPolicy.findOne({ 
        documentType: policy.documentType,
        isActive: true 
      });
      
      if (!existing) {
        await RetentionPolicy.create(policy);
        console.log(`[Retention] Created policy: ${policy.name}`);
      }
    }

    return { success: true, created: defaultPolicies.length };
  } catch (error) {
    console.error('[Retention] Failed to create default policies:', error);
    return { success: false, error };
  }
}
