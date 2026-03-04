import mongoose from 'mongoose';
import { RequestStatus, ActionType } from '../lib/types';

const approvalHistorySchema = new mongoose.Schema({
  action: { type: String, enum: Object.values(ActionType), required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String },
  budgetAvailable: { type: Boolean },
  forwardedMessage: { type: String },
  attachments: [{ type: String }],
  previousStatus: { type: String, enum: Object.values(RequestStatus) },
  newStatus: { type: String, enum: Object.values(RequestStatus) },
  // 🔹 Accountant budget trail (optional)
  budgetAllocated: { type: Number },
  budgetSpent: { type: Number },
  budgetBalance: { type: Number },
  // 🔹 Clarification tracking
  queryTarget: { type: String }, // For Dean -> Department queries
  queryType: { type: String }, // For Institution Manager -> SOP/Accountant
  queryRequest: { type: String }, // Question/note when rejecting for query
  queryResponse: { type: String }, // Response from lower level user
  queryAttachments: [{ type: String }], // Attachments for query response
  requiresClarification: { type: Boolean, default: false }, // Flag to indicate this is a query request
  originalRejector: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeanMediated: { type: Boolean, default: false },
  isDeanReapproval: { type: Boolean, default: false },
  departmentResponse: { type: String },
  timestamp: { type: Date, default: Date.now },
});

const requestSchema = new mongoose.Schema(
  {
    requestId: { 
      type: String, 
      unique: true, 
      required: true,
      validate: {
        validator: function(v: string) {
          return /^\d{6}$/.test(v); // Exactly 6 digits
        },
        message: 'Request ID must be exactly 6 digits'
      }
    },
    title: { type: String, required: true },
    purpose: { type: String, required: true },
    college: { type: String, required: true },
    department: { type: String, required: true },
    costEstimate: { type: Number, default: 0 },
    expenseCategory: { type: String, default: '' },
    requestType: { type: String, enum: ['one-time', 'renewal'], default: 'one-time' },
    renewalPeriod: { type: Number }, // Number of days/months/years for renewal
    renewalPeriodUnit: { type: String, enum: ['days', 'months', 'years'] },
    renewalDate: { type: Date }, // Date when renewal should be triggered
    parentRequestId: { type: String }, // ID of the original request (for tracking renewal chain)
    isRenewalGenerated: { type: Boolean, default: false }, // Flag to track if renewal was auto-generated
    sopReference: { type: String },
    attachments: [{ type: String, required: true, validate: [(v: string[]) => v.length > 0, 'At least one document is required'],}],

    // 🔹 NEW: Accountant budget fields (live values for current request)
    budgetAllocated: { type: Number, default: 0 },
    budgetSpent: { type: Number, default: 0 },
    budgetBalance: { type: Number, default: 0 },
    budgetNotAvailable: { type: Boolean, default: false }, // Flag to track budget not available path

    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.SUBMITTED,
    },
    pendingQuery: { type: Boolean, default: false }, // Flag to indicate request is pending query
    queryLevel: { type: String }, // The level that needs to provide query
    lastReminderSent: { type: Date }, // Track when the last reminder email was sent
    
    // Retention and compliance fields
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    retentionDate: { type: Date }, // Date when retention policy will be applied
    
    // Integration links
    integrationLinks: [{
      type: { type: String, enum: ['odoo_po', 'odoo_invoice', 'crm_contact', 'hrm_employee'] },
      externalId: { type: String },
      externalUrl: { type: String },
      linkedAt: { type: Date, default: Date.now },
      linkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    }],
    
    history: [approvalHistorySchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Request || mongoose.model('Request', requestSchema);
