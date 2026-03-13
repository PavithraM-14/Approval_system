import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomRole extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isSystemAdmin: boolean;
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canShare: boolean;
    canDownload: boolean;
    canForward: boolean;
    canManageBudget: boolean;
    canESign: boolean;
    canApprove: boolean;
    canRaiseQueries: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const customRoleSchema = new Schema<ICustomRole>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isSystemAdmin: {
      type: Boolean,
      default: false,
    },
    permissions: {
      canView: { type: Boolean, default: false },
      canCreate: { type: Boolean, default: false },
      canEdit: { type: Boolean, default: false },
      canShare: { type: Boolean, default: false },
      canDownload: { type: Boolean, default: false },
      canForward: { type: Boolean, default: false },
      canManageBudget: { type: Boolean, default: false },
      canESign: { type: Boolean, default: false },
      canApprove: { type: Boolean, default: false },
      canRaiseQueries: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Ensure role names are unique within a company
customRoleSchema.index({ companyId: 1, name: 1 }, { unique: true });

export default mongoose.models.CustomRole || mongoose.model<ICustomRole>('CustomRole', customRoleSchema);
