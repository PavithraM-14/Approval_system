import AuditLog, { AuditAction } from '../models/AuditLog';

interface AuditLogParams {
  action: AuditAction;
  userId: string;
  targetType: 'request' | 'document' | 'user' | 'system';
  targetId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await AuditLog.create({
      action: params.action,
      userId: params.userId,
      targetType: params.targetType,
      targetId: params.targetId,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      success: params.success ?? true,
      errorMessage: params.errorMessage,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 100,
  skip: number = 0
) {
  return await AuditLog.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'name email empId')
    .lean();
}

/**
 * Get audit logs for a specific target (request/document)
 */
export async function getTargetAuditLogs(
  targetType: string,
  targetId: string,
  limit: number = 100
) {
  return await AuditLog.find({ targetType, targetId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email empId')
    .lean();
}

/**
 * Get all audit logs with filters
 */
export async function getAuditLogs(filters: {
  action?: AuditAction;
  userId?: string;
  targetType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
}) {
  const query: any = {};

  if (filters.action) query.action = filters.action;
  if (filters.userId) query.userId = filters.userId;
  if (filters.targetType) query.targetType = filters.targetType;
  
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = filters.startDate;
    if (filters.endDate) query.createdAt.$lte = filters.endDate;
  }

  return await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .populate('userId', 'name email empId')
    .lean();
}

/**
 * Get audit statistics
 */
export async function getAuditStats(startDate?: Date, endDate?: Date) {
  const matchStage: any = {};
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }

  const stats = await AuditLog.aggregate([
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  return stats;
}

/**
 * Export user data for GDPR compliance
 */
export async function exportUserData(userId: string) {
  const User = (await import('../models/User')).default;
  const Request = (await import('../models/Request')).default;
  
  // Get user profile
  const user = await User.findById(userId).select('-password').lean();
  
  // Get user's requests
  const requests = await Request.find({ requester: userId }).lean();
  
  // Get user's audit logs
  const auditLogs = await AuditLog.find({ userId }).lean();
  
  return {
    user,
    requests,
    auditLogs,
    exportDate: new Date(),
  };
}

/**
 * Delete user data for GDPR compliance (Right to be forgotten)
 */
export async function deleteUserData(userId: string, performedBy: string) {
  const User = (await import('../models/User')).default;
  const Request = (await import('../models/Request')).default;
  
  // Log the deletion action
  await createAuditLog({
    action: AuditAction.DATA_DELETE,
    userId: performedBy,
    targetType: 'user',
    targetId: userId,
    details: { reason: 'GDPR Right to be forgotten' },
  });
  
  // Anonymize user data instead of hard delete (better for data integrity)
  await User.findByIdAndUpdate(userId, {
    name: '[DELETED USER]',
    email: `deleted_${userId}@deleted.local`,
    empId: `DELETED_${userId}`,
    contactNo: '[DELETED]',
    isActive: false,
  });
  
  // Optionally anonymize requests (keep for audit trail)
  // Or you can delete them if required
  // await Request.deleteMany({ requester: userId });
  
  return { success: true, message: 'User data anonymized' };
}
