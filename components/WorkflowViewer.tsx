'use client';

import React, { useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Node,
  Edge,
  BackgroundVariant,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './WorkflowBuilder.css';
import { nodeTypes } from './workflow-nodes';

interface WorkflowViewerProps {
  workflowId: string;
  executionStateId?: string;
  showHistory?: boolean;
}

interface ExecutionState {
  _id: string;
  requestId: string;
  workflowId: string;
  workflowVersion: number;
  companyId: string;
  currentNodeId: string;
  status: 'in_progress' | 'completed' | 'rejected';
  parallelPaths: ParallelPath[];
  history: ExecutionHistoryEntry[];
  startedAt: string;
  completedAt?: string;
}

interface ParallelPath {
  pathId: string;
  splitNodeId: string;
  joinNodeId: string;
  currentNodeId: string;
  status: 'active' | 'completed';
  completedAt?: string;
}

interface ExecutionHistoryEntry {
  nodeId: string;
  nodeType: string;
  action: 'entered' | 'approved' | 'rejected' | 'routed';
  userId?: string;
  userName?: string;
  notes?: string;
  timestamp: string;
  routingDecision?: boolean;
}

interface WorkflowConfiguration {
  _id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
}

const WorkflowViewer: React.FC<WorkflowViewerProps> = ({
  workflowId,
  executionStateId,
  showHistory = true,
}) => {
  const [workflow, setWorkflow] = useState<WorkflowConfiguration | null>(null);
  const [executionState, setExecutionState] = useState<ExecutionState | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch workflow configuration
  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        const response = await fetch(`/api/workflows/${workflowId}`);
        if (!response.ok) {
          throw new Error('Failed to load workflow');
        }
        const data = await response.json();
        setWorkflow(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load workflow');
      }
    };

    if (workflowId) {
      fetchWorkflow();
    }
  }, [workflowId]);

  // Fetch execution state if provided
  useEffect(() => {
    const fetchExecutionState = async () => {
      try {
        const response = await fetch(`/api/executions/${executionStateId}`);
        if (!response.ok) {
          throw new Error('Failed to load execution state');
        }
        const data = await response.json();
        setExecutionState(data);
      } catch (err: any) {
        console.error('Failed to load execution state:', err);
        // Don't set error here as execution state is optional
      }
    };

    if (executionStateId) {
      fetchExecutionState();
    }
  }, [executionStateId]);

  // Process nodes and edges with execution state highlighting
  useEffect(() => {
    if (!workflow) {
      setIsLoading(true);
      return;
    }

    const completedNodeIds = new Set<string>();
    const currentNodeIds = new Set<string>();
    const pendingNodeIds = new Set<string>();

    if (executionState) {
      // Mark completed nodes from history
      executionState.history.forEach((entry) => {
        if (entry.action === 'approved' || entry.action === 'routed') {
          completedNodeIds.add(entry.nodeId);
        }
      });

      // Mark current node(s)
      currentNodeIds.add(executionState.currentNodeId);
      
      // Mark current nodes in parallel paths
      executionState.parallelPaths.forEach((path) => {
        if (path.status === 'active') {
          currentNodeIds.add(path.currentNodeId);
        }
      });

      // Determine pending nodes (nodes that are reachable but not completed or current)
      const allNodeIds = new Set(workflow.nodes.map(n => n.id));
      allNodeIds.forEach((nodeId) => {
        if (!completedNodeIds.has(nodeId) && !currentNodeIds.has(nodeId)) {
          pendingNodeIds.add(nodeId);
        }
      });
    }

    // Apply styling to nodes based on execution state
    const styledNodes = workflow.nodes.map((node) => {
      let className = '';
      let style: React.CSSProperties = {};

      if (executionState) {
        if (currentNodeIds.has(node.id)) {
          // Current node - highlight with animation
          className = 'workflow-viewer-current-node';
          style = {
            ...style,
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.5)',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          };
        } else if (completedNodeIds.has(node.id)) {
          // Completed node - green tint
          className = 'workflow-viewer-completed-node';
          style = {
            ...style,
            opacity: 0.7,
            filter: 'grayscale(0.3)',
          };
        } else if (pendingNodeIds.has(node.id)) {
          // Pending node - dimmed
          className = 'workflow-viewer-pending-node';
          style = {
            ...style,
            opacity: 0.4,
          };
        }
      }

      return {
        ...node,
        className,
        style,
      };
    });

    // Apply styling to edges based on execution state
    const styledEdges = workflow.edges.map((edge) => {
      let style: React.CSSProperties = { ...edge.style };
      let animated = false;

      if (executionState) {
        const sourceCompleted = completedNodeIds.has(edge.source);
        const targetCurrent = currentNodeIds.has(edge.target);

        if (sourceCompleted && targetCurrent) {
          // Edge leading to current node
          style = {
            ...style,
            stroke: '#3b82f6',
            strokeWidth: 3,
          };
          animated = true;
        } else if (completedNodeIds.has(edge.source) && completedNodeIds.has(edge.target)) {
          // Edge between completed nodes
          style = {
            ...style,
            stroke: '#10b981',
            strokeWidth: 2,
          };
        } else {
          // Pending edge
          style = {
            ...style,
            stroke: '#d1d5db',
            strokeWidth: 1,
            opacity: 0.4,
          };
        }
      }

      return {
        ...edge,
        style,
        animated,
      };
    });

    setNodes(styledNodes);
    setEdges(styledEdges);
    setIsLoading(false);
  }, [workflow, executionState]);

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get action label for display
  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      entered: 'Entered',
      approved: 'Approved',
      rejected: 'Rejected',
      routed: 'Routed',
    };
    return labels[action] || action;
  };

  // Get status badge color
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="animate-spin h-10 w-10 text-blue-600 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="mt-4 text-sm text-gray-600">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="h-12 w-12 text-red-500 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-4 text-sm text-gray-900 font-medium">Error loading workflow</p>
          <p className="mt-1 text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {workflow?.name || 'Workflow Viewer'}
            </h2>
            {workflow?.description && (
              <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
            )}
          </div>
          {executionState && (
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  executionState.status
                )}`}
              >
                {executionState.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Workflow Visualization */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes as NodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={true}
            zoomOnScroll={true}
            fitView
          >
            <Controls showInteractive={false} />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>

        {/* Execution History Sidebar */}
        {showHistory && executionState && (
          <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution History</h3>
              
              {/* Timeline */}
              <div className="space-y-4">
                {executionState.history.length === 0 ? (
                  <p className="text-sm text-gray-500">No history available</p>
                ) : (
                  executionState.history.map((entry, index) => (
                    <div key={index} className="relative pl-6 pb-4">
                      {/* Timeline line */}
                      {index < executionState.history.length - 1 && (
                        <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-200"></div>
                      )}
                      
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white ${
                          entry.action === 'approved'
                            ? 'bg-green-500'
                            : entry.action === 'rejected'
                            ? 'bg-red-500'
                            : entry.action === 'routed'
                            ? 'bg-blue-500'
                            : 'bg-gray-400'
                        }`}
                      ></div>

                      {/* Entry content */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {getActionLabel(entry.action)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(entry.timestamp)}
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>
                            <span className="font-medium">Node:</span>{' '}
                            {workflow?.nodes.find(n => n.id === entry.nodeId)?.data?.label || entry.nodeId}
                          </div>
                          
                          {entry.userName && entry.userName.trim() !== '' && (
                            <div>
                              <span className="font-medium">User:</span> {entry.userName}
                            </div>
                          )}
                          
                          {entry.routingDecision !== undefined && (
                            <div>
                              <span className="font-medium">Decision:</span>{' '}
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  entry.routingDecision
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {entry.routingDecision ? 'True' : 'False'}
                              </span>
                            </div>
                          )}
                          
                          {entry.notes && entry.notes.trim() !== '' && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <span className="font-medium">Notes:</span>
                              <p className="mt-1 text-gray-700">{entry.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Execution metadata */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Execution Details</h4>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Started:</dt>
                    <dd className="text-gray-900 font-medium">
                      {formatTimestamp(executionState.startedAt)}
                    </dd>
                  </div>
                  {executionState.completedAt && (
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Completed:</dt>
                      <dd className="text-gray-900 font-medium">
                        {formatTimestamp(executionState.completedAt)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Workflow Version:</dt>
                    <dd className="text-gray-900 font-medium">v{executionState.workflowVersion}</dd>
                  </div>
                  {executionState.parallelPaths.length > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Parallel Paths:</dt>
                      <dd className="text-gray-900 font-medium">
                        {executionState.parallelPaths.filter(p => p.status === 'active').length} active,{' '}
                        {executionState.parallelPaths.filter(p => p.status === 'completed').length} completed
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {executionState && (
        <div className="bg-white border-t border-gray-200 px-6 py-3">
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500 shadow-lg"></div>
              <span className="text-gray-700">Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500 opacity-70"></div>
              <span className="text-gray-700">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-400 opacity-40"></div>
              <span className="text-gray-700">Pending</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowViewer;
