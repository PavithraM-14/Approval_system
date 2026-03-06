import mongoose from 'mongoose';

export interface IRetentionPolicy {
  _id: string;
  name: string;
  description: string;
  documentType: string; // 'financial', 'hr', 'contract', 'general', etc.
  retentionPeriodYears: number;
  action: 'archive' | 'delete' | 'review'; // What to do after retention period
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const retentionPolicySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  documentType: {
    type: String,
    required: true,
    enum: ['financial', 'hr', 'contract', 'legal', 'general', 'email', 'invoice', 'purchase_order'],
    index: true
  },
  retentionPeriodYears: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  action: {
    type: String,
    required: true,
    enum: ['archive', 'delete', 'review'],
    default: 'archive'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
retentionPolicySchema.index({ documentType: 1, isActive: 1 });

export default mongoose.models.RetentionPolicy || mongoose.model('RetentionPolicy', retentionPolicySchema);
