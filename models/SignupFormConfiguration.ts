import mongoose, { Schema, Document } from 'mongoose';

export interface ISignupField {
  fieldName: string; // 'name', 'email', 'empId', 'contactNo', 'college', 'department', 'groups', etc.
  label: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'multiselect' | 'textarea';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[]; // For select/multiselect fields
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    customMessage?: string;
  };
  order: number; // Display order
}

export interface ISignupFormConfiguration extends Document {
  companyId: mongoose.Types.ObjectId;
  roleId: mongoose.Types.ObjectId;
  roleName: string; // Cached for display
  fields: ISignupField[];
  requireGroupSelection: boolean;
  allowedGroupTypes?: ('region' | 'department' | 'cost_center' | 'custom')[]; // Which group types to show
  groupSelectionMode?: 'single' | 'multiple'; // Single or multiple group selection
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SignupFieldSchema = new Schema<ISignupField>(
  {
    fieldName: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'email', 'tel', 'select', 'multiselect', 'textarea'],
      required: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
    placeholder: String,
    helpText: String,
    options: [String],
    validation: {
      minLength: Number,
      maxLength: Number,
      pattern: String,
      customMessage: String,
    },
    order: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const SignupFormConfigurationSchema = new Schema<ISignupFormConfiguration>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomRole',
      required: true,
      index: true,
    },
    roleName: {
      type: String,
      required: true,
    },
    fields: {
      type: [SignupFieldSchema],
      required: true,
      default: [],
    },
    requireGroupSelection: {
      type: Boolean,
      default: false,
    },
    allowedGroupTypes: [{
      type: String,
      enum: ['region', 'department', 'cost_center', 'custom'],
    }],
    groupSelectionMode: {
      type: String,
      enum: ['single', 'multiple'],
      default: 'single',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one configuration per role per company
SignupFormConfigurationSchema.index({ companyId: 1, roleId: 1 }, { unique: true });

// Method to get default fields for a role
SignupFormConfigurationSchema.statics.getDefaultFields = function(): ISignupField[] {
  return [
    {
      fieldName: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'Enter your full name',
      order: 1,
    },
    {
      fieldName: 'empId',
      label: 'Employee ID',
      type: 'text',
      required: true,
      placeholder: 'Enter your employee ID',
      order: 2,
    },
    {
      fieldName: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'name@company.com',
      order: 3,
    },
    {
      fieldName: 'contactNo',
      label: 'Contact Number',
      type: 'tel',
      required: true,
      placeholder: 'Enter 10-digit contact number',
      validation: {
        pattern: '^[0-9]{10}$',
        customMessage: 'Contact number must be exactly 10 digits',
      },
      order: 4,
    },
    {
      fieldName: 'college',
      label: 'College/Institution',
      type: 'text',
      required: false,
      placeholder: 'Enter your college name',
      order: 5,
    },
    {
      fieldName: 'department',
      label: 'Department',
      type: 'text',
      required: false,
      placeholder: 'Enter your department',
      order: 6,
    },
  ];
};

interface ISignupFormConfigurationModel extends mongoose.Model<ISignupFormConfiguration> {
  getDefaultFields(): ISignupField[];
}

export default (mongoose.models.SignupFormConfiguration as ISignupFormConfigurationModel) || 
  mongoose.model<ISignupFormConfiguration, ISignupFormConfigurationModel>('SignupFormConfiguration', SignupFormConfigurationSchema);
