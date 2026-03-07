import mongoose from 'mongoose';

export interface IRole {
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
}

const roleSchema = new mongoose.Schema<IRole>({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  isSystemAdmin: { type: Boolean, default: false },
  permissions: {
    canView: { type: Boolean, default: true },
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
}, {
  timestamps: true,
});

export default mongoose.models.Role || mongoose.model<IRole>('Role', roleSchema);
