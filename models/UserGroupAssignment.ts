import mongoose, { Schema, Document } from 'mongoose';

export interface IUserGroupAssignment extends Document {
  userId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  assignedAt: Date;
}

const UserGroupAssignmentSchema = new Schema<IUserGroupAssignment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
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
    timestamps: true,
  }
);

// Compound index to ensure a user can only be assigned to a group once
UserGroupAssignmentSchema.index({ userId: 1, groupId: 1 }, { unique: true });

// Index for querying all users in a group
UserGroupAssignmentSchema.index({ groupId: 1, companyId: 1 });

// Index for querying all groups for a user
UserGroupAssignmentSchema.index({ userId: 1, companyId: 1 });

// Validation: Ensure user, group, and company exist and match
UserGroupAssignmentSchema.pre('save', async function(next) {
  try {
    // Check if group exists and belongs to the company
    const Group = mongoose.model('Group');
    const group = await Group.findById(this.groupId);
    if (!group) {
      return next(new Error('Group does not exist'));
    }
    if (group.companyId.toString() !== this.companyId.toString()) {
      return next(new Error('Group does not belong to the specified company'));
    }
    
    // Check if user exists and belongs to the company
    const User = mongoose.model('User');
    const user = await User.findById(this.userId);
    if (!user) {
      return next(new Error('User does not exist'));
    }
    if (user.company && user.company.toString() !== this.companyId.toString()) {
      return next(new Error('User does not belong to the specified company'));
    }
    
    next();
  } catch (error: any) {
    next(error);
  }
});

export default mongoose.models.UserGroupAssignment || 
  mongoose.model<IUserGroupAssignment>('UserGroupAssignment', UserGroupAssignmentSchema);
