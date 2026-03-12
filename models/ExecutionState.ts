import mongoose, { Schema, Document } from 'mongoose';

// Parallel path interface
export interface IParallelPath {
  pathId: string;
  splitNodeId: string;
  joinNodeId: string;
  currentNodeId: string;
  status: 'active' | 'completed';
  completedAt?: Date;
}

// Execution history entry interface
export interface IExecutionHistoryEntry {
  nodeId: string;
  nodeType: string;
  action: 'entered' | 'approved' | 'rejected' | 'routed';
  userId?: mongoose.Types.ObjectId;
  notes?: string;
  timestamp: Date;
  routingDecision?: boolean;
}

// Main execution state interface
export interface IExecutionState extends Document {
  requestId: string;
  workflowId: mongoose.Types.ObjectId;
  workflowVersion: number;
  companyId: mongoose.Types.ObjectId;
  currentNodeId: string;
  status: 'in_progress' | 'completed' | 'rejected';
  parallelPaths: IParallelPath[];
  history: IExecutionHistoryEntry[];
  requesterGroupIds: mongoose.Types.ObjectId[]; // Groups the requester belongs to
  startedAt: Date;
  completedAt?: Date;
}

// Parallel path subdocument schema
const ParallelPathSchema = new Schema<IParallelPath>(
  {
    pathId: {
      type: String,
      required: true,
    },
    splitNodeId: {
      type: String,
      required: true,
    },
    joinNodeId: {
      type: String,
      required: true,
    },
    currentNodeId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      required: true,
      default: 'active',
    },
    completedAt: {
      type: Date,
    },
  },
  { _id: false }
);

// Execution history entry subdocument schema
const ExecutionHistoryEntrySchema = new Schema<IExecutionHistoryEntry>(
  {
    nodeId: {
      type: String,
      required: true,
    },
    nodeType: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ['entered', 'approved', 'rejected', 'routed'],
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    routingDecision: {
      type: Boolean,
    },
  },
  { _id: false }
);

// Main execution state schema
const ExecutionStateSchema = new Schema<IExecutionState>(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    workflowId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkflowConfiguration',
      required: true,
    },
    workflowVersion: {
      type: Number,
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    currentNodeId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'rejected'],
      required: true,
      default: 'in_progress',
      index: true,
    },
    parallelPaths: {
      type: [ParallelPathSchema],
      default: [],
    },
    history: {
      type: [ExecutionHistoryEntrySchema],
      default: [],
    },
    requesterGroupIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Group',
      default: [],
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on companyId and status
ExecutionStateSchema.index({ companyId: 1, status: 1 });

export default mongoose.models.ExecutionState || 
  mongoose.model<IExecutionState>('ExecutionState', ExecutionStateSchema);
