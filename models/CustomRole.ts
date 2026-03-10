import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomRole extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
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
  },
  {
    timestamps: true,
  }
);

// Ensure role names are unique within a company
customRoleSchema.index({ companyId: 1, name: 1 }, { unique: true });

export default mongoose.models.CustomRole || mongoose.model<ICustomRole>('CustomRole', customRoleSchema);
