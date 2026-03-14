import mongoose, { Schema, Document } from 'mongoose';

// Node data interface for different node types
export interface INodeData {
  roleId?: mongoose.Types.ObjectId;
  groupScope?: {
    enabled: boolean;
    groupIds?: mongoose.Types.ObjectId[]; // Specific groups this node applies to
    matchType?: 'any' | 'all'; // Match any group or all groups
  };
  condition?: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
    value: any;
  };
  description?: string;
  options?: string[];
  // Grouping node specific properties
  groupType?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  borderColor?: string;
  level?: number; // For subgroup nesting level
  parentGroupId?: string; // For subgroup parent reference
}

// Workflow node interface
export interface IWorkflowNode {
  id: string;
  type: 'start' | 'end' | 'approval' | 'parallel_split' | 'parallel_join' | 'options' | 'grouping' | 'subgroup';
  label: string;
  position: { x: number; y: number };
  data: INodeData;
  parentId?: string; // For nodes that are children of grouping nodes
  extent?: 'parent'; // For nodes constrained within parent bounds
}

// Workflow edge interface
export interface IWorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'default';
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
      ref: 'CustomRole',
    },
    groupScope: {
      enabled: { type: Boolean, default: false },
      groupIds: [{
        type: Schema.Types.ObjectId,
        ref: 'Group',
      }],
      matchType: {
        type: String,
        enum: ['any', 'all'],
        default: 'any',
      },
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
    options: [{ type: String }],
    // Grouping node specific properties
    groupType: { type: String },
    width: { type: Number },
    height: { type: Number },
    backgroundColor: { type: String },
    borderColor: { type: String },
    level: { type: Number },
    parentGroupId: { type: String },
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
      enum: ['start', 'end', 'approval', 'parallel_split', 'parallel_join', 'options', 'grouping', 'subgroup'],
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
    parentId: { type: String }, // For nodes that are children of grouping nodes
    extent: { type: String, enum: ['parent'] }, // For nodes constrained within parent bounds
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
      enum: ['default'],
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
