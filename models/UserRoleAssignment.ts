import mongoose, { Schema, Document } from 'mongoose';

export interface IUserRoleAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  roleId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  assignedAt: Date;
}

const userRoleAssignmentSchema = new Schema<IUserRoleAssignment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomRole',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // Using assignedAt instead of createdAt/updatedAt
  }
);

// Compound indexes for efficient queries
userRoleAssignmentSchema.index({ userId: 1, companyId: 1 });
userRoleAssignmentSchema.index({ roleId: 1, companyId: 1 });

// Prevent duplicate assignments - unique index on (userId, roleId)
userRoleAssignmentSchema.index({ userId: 1, roleId: 1 }, { unique: true });

export default mongoose.models.UserRoleAssignment || 
  mongoose.model<IUserRoleAssignment>('UserRoleAssignment', userRoleAssignmentSchema);
