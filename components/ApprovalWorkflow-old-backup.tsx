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
  position?: { x: number; y: number };
  parentId?: string;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface VisualNode {
  id: string;
  name: string;
  type: string;
  status: 'completed' | 'active' | 'pending';
  children?: VisualNode[];
  isParallel?: boolean;
  isOption?: boolean;
  groupType?: string;
}

const ApprovalWorkflowEnhanced: React.FC<ApprovalWorkflowProps> = ({ 
  currentStatus, 
  requestId, 
  workflowExecutionId 
}) => {
  const [visualTree, setVisualTree] = useState<VisualNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflowName, setWorkflowName] = useState('Approval Workflow');
  const [currentNodeId, setCurrentNodeId] = useState<string>('');
  const [completedNodeIds, setCompletedNodeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        // Fetch user and company
        const userResponse = await fetch('/api/auth/me');
        if (!userResponse.ok) throw new Error('Failed to fetch user');
        
        const userData = await userResponse.json();
        const user = userData.user || userData;
        const companyId = user.company?._id || user.company;

        if (!companyId) throw new Error('No company found');

        // Fetch workflow
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

        // Fetch execution state if available
        let executionData = null;
        if (workflowExecutionId) {
          const execResponse = await fetch(`/api/executions/${workflowExecutionId}`);
          if (execResponse.ok) {
            executionData = await execResponse.json();
            setCurrentNodeId(executionData.currentNodeId);
            
            // Build completed nodes set from execution history
            const completed = new Set<string>();
            if (executionData.history) {
              executionData.history.forEach((h: any) => {
                if (h.action === 'approved' || h.action === 'forwarded') {
                  completed.add(h.nodeId);
                }
              });
            }
            setCompletedNodeIds(completed);
          }
        }

        // Build visual tree
        const tree = buildVisualTree(
          activeWorkflow.nodes,
          activeWorkflow.edges,
          currentNodeId || '',
          completedNodeIds
        );
        
        setVisualTree(tree);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching workflow:', error);
        setVisualTree([]);
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

  if (visualTree.length === 0) {
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
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-4 min-w-full">
            {visualTree.map((node, index) => (
              <React.Fragment key={node.id}>
                {renderNode(node)}
                {index < visualTree.length - 1 && (
                  <div className="flex justify-center">
                    <div className="w-0.5 h-8 bg-gray-300"></div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function buildVisualTree(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  currentNodeId: string,
  completedNodeIds: Set<string>
): VisualNode[] {
  const tree: VisualNode[] = [];
  const visited = new Set<string>();
  
  // Find start node
  const startNode = nodes.find(n => n.type === 'start');
  if (!startNode) return tree;

  // Helper to get node status
  const getStatus = (nodeId: string): 'completed' | 'active' | 'pending' => {
    if (completedNodeIds.has(nodeId)) return 'completed';
    if (nodeId === currentNodeId) return 'active';
    return 'pending';
  };

  // Helper to find next nodes
  const getNextNodes = (nodeId: string): string[] => {
    return edges.filter(e => e.source === nodeId).map(e => e.target);
  };

  // Helper to check if node is in a group
  const getGroupInfo = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node?.parentId) return null;
    
    const parentNode = nodes.find(n => n.id === node.parentId);
    return parentNode;
  };

  // Recursive function to build tree
  const buildNode = (nodeId: string): VisualNode | null => {
    if (visited.has(nodeId)) return null;
    visited.add(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    // Skip grouping and subgroup nodes (they're visual containers)
    if (node.type === 'grouping' || node.type === 'subgroup') {
      // Process children of this group
      const children = nodes.filter(n => n.parentId === nodeId);
      const childVisualNodes: VisualNode[] = [];
      
      for (const child of children) {
        const childNode = buildNode(child.id);
        if (childNode) childVisualNodes.push(childNode);
      }
      
      if (childVisualNodes.length > 0) {
        return {
          id: node.id,
          name: node.label || node.data?.label || 'Group',
          type: node.type,
          status: 'pending',
          children: childVisualNodes,
          groupType: node.data?.groupType || node.data?.subGroupType
        };
      }
      return null;
    }

    const visualNode: VisualNode = {
      id: node.id,
      name: node.label || node.data?.label || node.type,
      type: node.type,
      status: getStatus(node.id)
    };

    // Handle parallel split
    if (node.type === 'parallel_split') {
      const nextNodeIds = getNextNodes(node.id);
      const parallelBranches: VisualNode[] = [];
      
      for (const nextId of nextNodeIds) {
        const branchNode = buildNode(nextId);
        if (branchNode) parallelBranches.push(branchNode);
      }
      
      visualNode.children = parallelBranches;
      visualNode.isParallel = true;
      return visualNode;
    }

    // Handle options node
    if (node.type === 'options') {
      const nextNodeIds = getNextNodes(node.id);
      const optionBranches: VisualNode[] = [];
      
      for (const nextId of nextNodeIds) {
        const optionNode = buildNode(nextId);
        if (optionNode) optionBranches.push(optionNode);
      }
      
      visualNode.children = optionBranches;
      visualNode.isOption = true;
      return visualNode;
    }

    // Handle parallel join - continue to next node
    if (node.type === 'parallel_join') {
      const nextNodeIds = getNextNodes(node.id);
      if (nextNodeIds.length > 0) {
        const nextNode = buildNode(nextNodeIds[0]);
        if (nextNode) {
          visualNode.children = [nextNode];
        }
      }
      return visualNode;
    }

    // For regular nodes, continue to next
    if (node.type !== 'end') {
      const nextNodeIds = getNextNodes(node.id);
      if (nextNodeIds.length > 0) {
        const nextNode = buildNode(nextNodeIds[0]);
        if (nextNode) {
          visualNode.children = [nextNode];
        }
      }
    }

    return visualNode;
  };

  // Start building from start node
  const rootNode = buildNode(startNode.id);
  if (rootNode) {
    // Get first real node after start
    const firstNextIds = getNextNodes(startNode.id);
    if (firstNextIds.length > 0) {
      const firstNode = buildNode(firstNextIds[0]);
      if (firstNode) tree.push(firstNode);
    }
  }

  return tree;
}

function renderNode(node: VisualNode): JSX.Element {
  const statusColors = {
    completed: 'bg-green-500 text-white border-green-600',
    active: 'bg-blue-600 text-white border-blue-700 ring-4 ring-blue-200',
    pending: 'bg-gray-100 text-gray-600 border-gray-300'
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

  // Group/Subgroup rendering
  if (node.type === 'grouping' || node.type === 'subgroup') {
    const borderColor = node.type === 'grouping' ? 'border-blue-400' : 'border-orange-400';
    const bgColor = node.type === 'grouping' ? 'bg-blue-50' : 'bg-orange-50';
    
    return (
      <div className={`border-2 border-dashed ${borderColor} ${bgColor} rounded-lg p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="font-semibold text-gray-700">{node.name}</span>
          {node.groupType && (
            <span className="text-xs px-2 py-1 bg-white rounded-full text-gray-600">
              {node.groupType}
            </span>
          )}
        </div>
        <div className="space-y-3 ml-4">
          {node.children?.map(child => renderNode(child))}
        </div>
      </div>
    );
  }

  // Parallel split rendering
  if (node.isParallel) {
    return (
      <div className="flex flex-col items-center">
        <div className={`px-4 py-2 rounded-lg border-2 ${statusColors[node.status]} font-semibold flex items-center gap-2`}>
          {statusIcons[node.status]}
          <span>{node.name}</span>
        </div>
        
        {node.children && node.children.length > 0 && (
          <>
            <div className="w-0.5 h-4 bg-gray-300"></div>
            <div className="flex gap-8 items-start">
              {node.children.map((child, idx) => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-0.5 h-4 bg-gray-300"></div>
                  {renderNode(child)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Option node rendering
  if (node.isOption) {
    return (
      <div className="flex flex-col items-center">
        <div className={`px-4 py-2 rounded-lg border-2 ${statusColors[node.status]} font-semibold flex items-center gap-2`}>
          {statusIcons[node.status]}
          <span>{node.name}</span>
          <span className="text-xs opacity-75">(Choose One)</span>
        </div>
        
        {node.children && node.children.length > 0 && (
          <>
            <div className="w-0.5 h-4 bg-gray-300"></div>
            <div className="flex gap-6 items-start">
              {node.children.map((child, idx) => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-0.5 h-4 bg-gray-300"></div>
                  {renderNode(child)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Regular node rendering
  return (
    <div className="flex flex-col items-center">
      <div className={`px-6 py-3 rounded-lg border-2 ${statusColors[node.status]} font-semibold flex items-center gap-3 min-w-[160px] justify-center`}>
        {statusIcons[node.status]}
        <span>{node.name}</span>
        {node.status === 'active' && (
          <span className="text-xs font-normal opacity-90">● Active</span>
        )}
      </div>
      
      {node.children && node.children.length > 0 && (
        <>
          <div className="w-0.5 h-8 bg-gray-300"></div>
          {node.children.map(child => renderNode(child))}
        </>
      )}
    </div>
  );
}

export default ApprovalWorkflowEnhanced;
