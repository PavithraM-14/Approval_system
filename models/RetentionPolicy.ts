import mongoose from 'mongoose';

export enum RetentionAction {
  ARCHIVE = 'archive',
  DELETE = 'delete',
  NOTIFY = 'notify',
}

const retentionPolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    documentType: {
      type: String,
      required: false, // If null, applies to all documents
    },
    category: {
      type: String,
      required: false, // If null, applies to all categories
    },
    retentionPeriodDays: {
      type: Number,
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(RetentionAction),
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notifyBeforeDays: {
      type: Number,
      default: 30, // Notify 30 days before action
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.RetentionPolicy || mongoose.model('RetentionPolicy', retentionPolicySchema);
