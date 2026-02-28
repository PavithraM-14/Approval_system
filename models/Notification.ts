import mongoose from 'mongoose';

export interface INotification {
  _id: string;
  userId: mongoose.Types.ObjectId;
  requestId: mongoose.Types.ObjectId;
  type: 'approval_pending' | 'approval_approved' | 'approval_rejected' | 'query_received' | 'query_responded' | 'request_created' | 'request_completed';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    requestTitle?: string;
    requestId?: string;
    actorName?: string;
    actorRole?: string;
    status?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  requestId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Request', 
    required: true 
  },
  type: { 
    type: String, 
    enum: [
      'approval_pending',
      'approval_approved', 
      'approval_rejected',
      'query_received',
      'query_responded',
      'request_created',
      'request_completed'
    ],
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false, index: true },
  actionUrl: { type: String },
  metadata: {
    requestTitle: String,
    requestId: String,
    actorName: String,
    actorRole: String,
    status: String,
  },
}, {
  timestamps: true,
});

// Compound index for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
