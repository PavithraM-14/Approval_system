import mongoose from 'mongoose';

export enum AuditAction {
  // Document actions
  DOCUMENT_UPLOAD = 'document_upload',
  DOCUMENT_VIEW = 'document_view',
  DOCUMENT_DOWNLOAD = 'document_download',
  DOCUMENT_DELETE = 'document_delete',
  DOCUMENT_UPDATE = 'document_update',
  
  // Request actions
  REQUEST_CREATE = 'request_create',
  REQUEST_APPROVE = 'request_approve',
  REQUEST_REJECT = 'request_reject',
  REQUEST_FORWARD = 'request_forward',
  REQUEST_VIEW = 'request_view',
  
  // User actions
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_FAILED_LOGIN = 'user_failed_login',
  
  // System actions
  DATA_EXPORT = 'data_export',
  DATA_DELETE = 'data_delete',
  BACKUP_CREATE = 'backup_create',
}

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['request', 'document', 'user', 'system'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
