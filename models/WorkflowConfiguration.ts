import mongoose, { Schema, Document } from 'mongoose';

// Node data interface for different node types
export interface INodeData {
  roleId?: mongoose.Types.ObjectId;
  condition?: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
    value: any;
  };
  description?: string;
}

// Workflow node interface
export interface IWorkflowNode {
  id: string;
  type: 'start' | 'end' | 'approval' | 'parallel_split' | 'parallel_join' | 'conditional';
  label: string;
  position: { x: number; y: number };
  data: INodeData;
}

// Workflow edge interface
export interface IWorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'default' | 'conditional';
}

// Main workflow configuration interface
export interface IWorkflowConfiguration extends Document {
  companyId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  nodes: IWorkflowNode[];
  edges: IWorkflowEdge[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Node data subdocument schema
const NodeDataSchema = new Schema<INodeData>(
  {
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
    },
    condition: {
      field: { type: String },
      operator: {
        type: String,
        enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains'],
      },
      value: { type: Schema.Types.Mixed },
    },
    description: { type: String },
  },
  { _id: false }
);

// Workflow node subdocument schema
const WorkflowNodeSchema = new Schema<IWorkflowNode>(
  {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['start', 'end', 'approval', 'parallel_split', 'parallel_join', 'conditional'],
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    data: {
      type: NodeDataSchema,
      required: true,
    },
  },
  { _id: false }
);

// Workflow edge subdocument schema
const WorkflowEdgeSchema = new Schema<IWorkflowEdge>(
  {
    id: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    target: {
      type: String,
      required: true,
    },
    label: { type: String },
    type: {
      type: String,
      enum: ['default', 'conditional'],
    },
  },
  { _id: false }
);

// Main workflow configuration schema
const WorkflowConfigurationSchema = new Schema<IWorkflowConfiguration>(
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
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    nodes: {
      type: [WorkflowNodeSchema],
      required: true,
      validate: {
        validator: function(v: IWorkflowNode[]) {
          return v.length > 0;
        },
        message: 'Workflow must have at least one node',
      },
    },
    edges: {
      type: [WorkflowEdgeSchema],
      required: true,
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

// Compound indexes
WorkflowConfigurationSchema.index({ companyId: 1, version: -1 });
WorkflowConfigurationSchema.index({ companyId: 1, isActive: 1 });

export default mongoose.models.WorkflowConfiguration || 
  mongoose.model<IWorkflowConfiguration>('WorkflowConfiguration', WorkflowConfigurationSchema);
