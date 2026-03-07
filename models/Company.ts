import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  adminEmail: string;
  adminContactNo: string;
  adminUserId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    adminEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    adminContactNo: {
      type: String,
      required: true,
    },
    adminUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

// Create text index for company search
CompanySchema.index({ name: 'text' });

export default mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);
