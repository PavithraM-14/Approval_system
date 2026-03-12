import mongoose, { Schema, Document } from 'mongoose';

export interface IRequestFormField {
  fieldName: string;
  label: string;
  required: boolean;
  enabled: boolean;
  order: number;
}

export interface IRequestFormConfiguration extends Document {
  companyId: mongoose.Types.ObjectId;
  fields: IRequestFormField[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RequestFormFieldSchema = new Schema<IRequestFormField>(
  {
    fieldName: { type: String, required: true },
    label: { type: String, required: true },
    required: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    order: { type: Number, required: true },
  },
  { _id: false }
);

const RequestFormConfigurationSchema = new Schema<IRequestFormConfiguration>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    fields: {
      type: [RequestFormFieldSchema],
      required: true,
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

RequestFormConfigurationSchema.statics.getDefaultFields = function (): IRequestFormField[] {
  return [
    {
      fieldName: 'title',
      label: 'Title',
      required: true,
      enabled: true,
      order: 1,
    },
    {
      fieldName: 'purpose',
      label: 'Purpose',
      required: true,
      enabled: true,
      order: 2,
    },
    {
      fieldName: 'college',
      label: 'Institution',
      required: false,
      enabled: true,
      order: 3,
    },
    {
      fieldName: 'department',
      label: 'Department',
      required: false,
      enabled: true,
      order: 4,
    },
    {
      fieldName: 'costEstimate',
      label: 'Cost Estimate',
      required: false,
      enabled: true,
      order: 5,
    },
    {
      fieldName: 'expenseCategory',
      label: 'Expense Category',
      required: false,
      enabled: true,
      order: 6,
    },
    {
      fieldName: 'requestType',
      label: 'Request Type',
      required: true,
      enabled: true,
      order: 7,
    },
  ];
};

export default mongoose.models.RequestFormConfiguration ||
  mongoose.model<IRequestFormConfiguration>('RequestFormConfiguration', RequestFormConfigurationSchema);

