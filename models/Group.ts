import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
  companyId: mongoose.Types.ObjectId;
  name: string;
  type: 'region' | 'department' | 'cost_center' | 'custom';
  description?: string;
  parentGroupId?: mongoose.Types.ObjectId; // For hierarchical groups
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
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
    type: {
      type: String,
      enum: ['region', 'department', 'cost_center', 'custom'],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    parentGroupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique group names within a company
GroupSchema.index({ companyId: 1, name: 1 }, { unique: true });

// Index for hierarchical queries
GroupSchema.index({ parentGroupId: 1 });

// Validation: Prevent circular parent references
GroupSchema.pre('save', async function(next) {
  if (this.parentGroupId) {
    // Check if parent exists
    const parent = await mongoose.model('Group').findById(this.parentGroupId);
    if (!parent) {
      return next(new Error('Parent group does not exist'));
    }
    
    // Check if parent belongs to same company
    if (parent.companyId.toString() !== this.companyId.toString()) {
      return next(new Error('Parent group must belong to the same company'));
    }
    
    // Prevent self-reference
    if (this.parentGroupId.toString() === this._id?.toString()) {
      return next(new Error('Group cannot be its own parent'));
    }
    
    // Prevent circular references (check if this group is an ancestor of the parent)
    let currentParent = parent;
    const visited = new Set<string>();
    while (currentParent.parentGroupId) {
      const parentId = currentParent.parentGroupId.toString();
      if (visited.has(parentId)) {
        return next(new Error('Circular parent reference detected'));
      }
      if (parentId === this._id?.toString()) {
        return next(new Error('Circular parent reference detected'));
      }
      visited.add(parentId);
      currentParent = await mongoose.model('Group').findById(currentParent.parentGroupId);
      if (!currentParent) break;
    }
  }
  next();
});

export default mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);
