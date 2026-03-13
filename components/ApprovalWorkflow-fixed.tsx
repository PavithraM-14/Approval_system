'use client';

import React, { useEffect, useState } from 'react';
import { RequestStatus } from '../lib/types';

interface ApprovalWorkflowProps {
  currentStatus: RequestStatus;
  requestId?: string;
  workflowExecutionId?: string;
}

interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  data?: any;
  parentId?: string;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface FlowStep {
  id: string;
  name: string;
  type: string;
  status: 'completed' | 'active' | 'pending';
  groupName?: string;
  groupType?: string;
  parallelBranches?: FlowStep[][];
  optionBranches?: FlowStep[][];
}

const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({ 
  currentStatus, 
  requestId, 
  workflowExecutionId 
}) => {
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflowName, setWorkflowName] = useState('Approval Workflow');

  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        const userResponse = await fetch('/api/auth/me');
        if (!userResponse.ok) throw new Error('Failed to fetch user');
        
        const userData = await userResponse.json();
        const user = userData.user || userData;
        const companyId = user.company?._id || user.company;

        if (!companyId) throw new Error('No company found');

        const workflowResponse = await fetch(`/api/workflows/company/${companyId}`);
        if (!workflowResponse.ok) throw new Error('Failed to fetch workflow');

        const workflowsData = await workflowResponse.json();
        const activeWorkflow = Array.isArray(workflowsData) 
          ? workflowsData.find((w: any) => w.isActive) || workflowsData[0]
          : workflowsData.workflows?.find((w: any) => w.isActive);

        if (!activeWorkflow || !activeWorkflow.nodes) {
          throw new Error('No workflow found');
        }

        setWorkflowName(activeWorkflow.name || 'Approval Workflow');

        let currentNodeId = '';
        let completedNodeIds = new Set<string>();

        if (workflowExecutionId) {
          const execResponse = await fetch(`/api/executions/${workflowExecutionId}`);
          if (execResponse.ok) {
            const executionData = await execResponse.json();
            currentNodeId = executionData.currentNodeId;
            
            if (executionData.history) {
              executionData.history.forEach((h: any) => {
                if (h.action === 'approved' || h.action === 'forwarded') {
                  completedNodeIds.add(h.nodeId);
                }
              });
            }
          }
        }

        const steps = buildFlowSteps(
          activeWorkflow.nodes,
          activeWorkflow.edges,
          currentNodeId,
          completedNodeIds
        );
        
        setFlowSteps(steps);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching workflow:', error);
        setFlowSteps([]);
        setLoading(false);
      }
    };

    fetchWorkflow();
  }, [workflowExecutionId, requestId, currentStatus]);

  if (loading) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Approval Workflow</h3>
          <p className="mt-1 text-sm text-gray-500">Loading workflow...</p>
        </div>
        <div className="border-t border-gray-200 px-4 py-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (flowSteps.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Approval Workflow</h3>
          <p className="mt-1 text-sm text-gray-500">No workflow configured</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">{workflowName}</h3>
            <p className="mt-1 text-sm text-gray-500">Current status of this request in the approval process</p>
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
        <div className="overflow-x-auto pb-4">
          <div className="flex flex-col gap-4 items-center min-w-full">
            {flowSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                {renderStep(step)}
                {index < flowSteps.length - 1 && (
                  <div className="w-0.5 h-8 bg-gray-300"></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function buildFlowSteps(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  currentNodeId: string,
  completedNodeIds: Set<string>
): FlowStep[] {
  const steps: FlowStep[] = [];
  const visited = new Set<string>();
  
  const startNode = nodes.find(n => n.type === 'start');
  if (!startNode) return steps;

  const getStatus = (nodeId: string): 'completed' | 'active' | 'pending' => {
    if (completedNodeIds.has(nodeId)) return 'completed';
    if (nodeId === currentNodeId) return 'active';
    return 'pending';
  };

  const getNextNodes = (nodeId: string): string[] => {
    return edges.filter(e => e.source === nodeId).map(e => e.target);
  };

  const getGroupInfo = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node?.parentId) return null;
    const parentNode = nodes.find(n => n.id === node.parentId);
    return parentNode;
  };

  const buildPath = (nodeId: string, stopAtJoin: boolean = false, stopAtEnd: boolean = false): FlowStep[] => {
    const path: FlowStep[] = [];
    let currentId = nodeId;

    while (currentId && !visited.has(currentId)) {
      const node = nodes.find(n => n.id === currentId);
      if (!node) break;

      // Skip containers
      if (node.type === 'grouping' || node.type === 'subgroup') {
        const nextIds = getNextNodes(currentId);
        currentId = nextIds[0];
        continue;
      }

      // Skip start
      if (node.type === 'start') {
        const nextIds = getNextNodes(currentId);
        currentId = nextIds[0];
        continue;
      }

      // Stop at join if in parallel branch
      if (node.type === 'parallel_join' && stopAtJoin) {
        break;
      }

      // Stop at end if requested (for option branches)
      if (node.type === 'end' && stopAtEnd) {
        break;
      }

      visited.add(currentId);

      const step: FlowStep = {
        id: node.id,
        name: node.label || node.data?.label || node.type,
        type: node.type,
        status: getStatus(node.id)
      };

      const groupNode = getGroupInfo(node.id);
      if (groupNode) {
        step.groupName = groupNode.label || groupNode.data?.label;
        step.groupType = groupNode.type;
      }

      // Handle parallel split
      if (node.type === 'parallel_split') {
        const branchIds = getNextNodes(currentId);
        const branches: FlowStep[][] = [];
        
        for (const branchId of branchIds) {
          const branchPath = buildPath(branchId, true, false);
          if (branchPath.length > 0) branches.push(branchPath);
        }
        
        step.parallelBranches = branches;
        path.push(step);
        
        // Find join and continue
        const joinNode = nodes.find(n => n.type === 'parallel_join');
        if (joinNode) {
          const nextIds = getNextNodes(joinNode.id);
          currentId = nextIds[0];
        } else {
          break;
        }
        continue;
      }

      // Handle options
      if (node.type === 'options') {
        const optionIds = getNextNodes(currentId);
        const options: FlowStep[][] = [];
        
        // Build each option branch, stopping before the end node
        for (const optionId of optionIds) {
          const optionPath = buildPath(optionId, false, true);
          if (optionPath.length > 0) options.push(optionPath);
        }
        
        step.optionBranches = options;
        path.push(step);
        
        // Find the common end node and add it after options
        const firstOptionNext = getNextNodes(optionIds[0]);
        if (firstOptionNext.length > 0) {
          const endNode = nodes.find(n => n.id === firstOptionNext[0]);
          if (endNode && endNode.type === 'end') {
            path.push({
              id: endNode.id,
              name: endNode.label || endNode.data?.label || 'Approved',
              type: endNode.type,
              status: getStatus(endNode.id)
            });
          }
        }
        
        break; // Options are terminal
      }

      path.push(step);

      if (node.type === 'end') break;

      const nextIds = getNextNodes(currentId);
      currentId = nextIds[0];
    }

    return path;
  };

  const firstNextIds = getNextNodes(startNode.id);
  if (firstNextIds.length > 0) {
    return buildPath(firstNextIds[0]);
  }

  return steps;
}

function renderStep(step: FlowStep): JSX.Element {
  const statusColors = {
    completed: 'bg-green-500 text-white border-green-600',
    active: 'bg-blue-600 text-white border-blue-700 ring-4 ring-blue-200 shadow-lg',
    pending: 'bg-white text-gray-700 border-gray-300'
  };

  const statusIcons = {
    completed: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ),
    active: (
      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
    ),
    pending: (
      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
    )
  };

  // Parallel split
  if (step.parallelBranches && step.parallelBranches.length > 0) {
    return (
      <div className="flex flex-col items-center w-full">
        <div className={`px-6 py-3 rounded-lg border-2 ${statusColors[step.status]} font-semibold flex items-center gap-3 shadow-md`}>
          {statusIcons[step.status]}
          <span>{step.name}</span>
        </div>
        <div className="w-0.5 h-6 bg-gray-300"></div>
        <div className="flex gap-8 items-start justify-center flex-wrap">
          {step.parallelBranches.map((branch, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="w-0.5 h-6 bg-gray-300"></div>
              <div className="border-2 border-dashed border-purple-300 bg-purple-50 rounded-lg p-4">
                <div className="text-xs text-purple-700 font-semibold mb-3 text-center">Parallel Branch {idx + 1}</div>
                <div className="flex flex-col gap-3">
                  {branch.map((branchStep, bIdx) => (
                    <React.Fragment key={branchStep.id}>
                      {renderStepCompact(branchStep)}
                      {bIdx < branch.length - 1 && <div className="w-0.5 h-4 bg-gray-300 mx-auto"></div>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Options
  if (step.optionBranches && step.optionBranches.length > 0) {
    return (
      <div className="flex flex-col items-center w-full">
        <div className={`px-6 py-3 rounded-lg border-2 ${statusColors[step.status]} font-semibold flex items-center gap-3 shadow-md`}>
          {statusIcons[step.status]}
          <span>{step.name}</span>
          <span className="text-xs opacity-75 font-normal">(Choose One)</span>
        </div>
        <div className="w-0.5 h-6 bg-gray-300"></div>
        <div className="flex gap-6 items-start justify-center flex-wrap">
          {step.optionBranches.map((option, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="w-0.5 h-6 bg-gray-300"></div>
              <div className="border-2 border-dashed border-teal-300 bg-teal-50 rounded-lg p-4">
                <div className="text-xs text-teal-700 font-semibold mb-3 text-center">Option {idx + 1}</div>
                <div className="flex flex-col gap-3">
                  {option.map((optionStep, oIdx) => (
                    <React.Fragment key={optionStep.id}>
                      {renderStepCompact(optionStep)}
                      {oIdx < option.length - 1 && <div className="w-0.5 h-4 bg-gray-300 mx-auto"></div>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Regular step
  return renderStepCompact(step);
}

function renderStepCompact(step: FlowStep): JSX.Element {
  const statusColors = {
    completed: 'bg-green-500 text-white border-green-600',
    active: 'bg-blue-600 text-white border-blue-700 ring-4 ring-blue-200 shadow-lg',
    pending: 'bg-white text-gray-700 border-gray-300'
  };

  const statusIcons = {
    completed: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ),
    active: (
      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
    ),
    pending: (
      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
    )
  };

  return (
    <div className={`px-6 py-3 rounded-lg border-2 ${statusColors[step.status]} font-semibold flex items-center gap-3 min-w-[180px] justify-center shadow-sm transition-all duration-200 hover:shadow-md`}>
      {statusIcons[step.status]}
      <div className="flex flex-col items-center">
        <span className="text-center">{step.name}</span>
        {step.groupName && (
          <span className="text-[10px] opacity-75 font-normal mt-0.5 flex items-center gap-1">
            {step.groupType === 'subgroup' ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
              </svg>
            )}
            <span>{step.groupName}</span>
          </span>
        )}
      </div>
      {step.status === 'active' && (
        <span className="text-xs font-normal opacity-90">● Active</span>
      )}
    </div>
  );
}

export default ApprovalWorkflow;
