'use client';

import React, { useEffect, useState } from 'react';
import { RequestStatus } from '../lib/types';

interface ApprovalWorkflowProps {
  currentStatus: RequestStatus;
  requestId?: string;
  workflowExecutionId?: string;
}

interface WorkflowStep {
  id: string;
  name: string;
  roleName?: string;
  type?: string;
}

const getStatusBadgeClass = (status: string, isCurrent: boolean, isCompleted: boolean) => {
  if (isCurrent) {
    return 'bg-blue-500 text-white shadow-lg';
  }
  if (isCompleted) {
    return 'bg-green-500 text-white';
  }
  return 'bg-gray-200 text-gray-600';
};

const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({ currentStatus, requestId, workflowExecutionId }) => {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [workflowName, setWorkflowName] = useState('Approval Workflow');

  useEffect(() => {
    const fetchWorkflowSteps = async () => {
      try {
        // First, get the current user's company
        const userResponse = await fetch('/api/auth/me');
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user');
        }
        const userData = await userResponse.json();
        const user = userData.user || userData;
        const companyId = user.company?._id || user.company;

        if (!companyId) {
          throw new Error('No company found for user');
        }

        // Fetch the active workflow for this company
        const workflowResponse = await fetch(`/api/workflows/company/${companyId}`);
        if (!workflowResponse.ok) {
          throw new Error('Failed to fetch workflow');
        }

        const workflowsData = await workflowResponse.json();
        
        console.log('[ApprovalWorkflow] Fetched workflows:', workflowsData);
        console.log('[ApprovalWorkflow] Workflows details:', workflowsData.map((w: any) => ({
          name: w.name,
          isActive: w.isActive,
          nodeCount: w.nodes?.length,
          edgeCount: w.edges?.length
        })));
        
        // Try to find active workflow, or use the most recent one
        let activeWorkflow = Array.isArray(workflowsData) 
          ? workflowsData.find((w: any) => w.isActive)
          : workflowsData.workflows?.find((w: any) => w.isActive);
        
        // If no active workflow, use the first one (most recent)
        if (!activeWorkflow && Array.isArray(workflowsData) && workflowsData.length > 0) {
          console.log('[ApprovalWorkflow] No active workflow found, using most recent');
          activeWorkflow = workflowsData[0];
        }

        console.log('[ApprovalWorkflow] Selected workflow:', activeWorkflow);

        if (activeWorkflow && activeWorkflow.nodes) {
          setWorkflowName(activeWorkflow.name || 'Approval Workflow');

          // Find the start node
          const startNode = activeWorkflow.nodes.find((n: any) => n.type === 'start');
          
          console.log('[ApprovalWorkflow] Start node:', startNode);
          console.log('[ApprovalWorkflow] All nodes:', activeWorkflow.nodes);
          console.log('[ApprovalWorkflow] All edges:', activeWorkflow.edges);

          if (!startNode) {
            throw new Error('No start node found in workflow');
          }

          // Build the workflow path by following edges
          const steps: WorkflowStep[] = [];
          const edges = activeWorkflow.edges || [];
          let currentNodeId = startNode.id;
          const visited = new Set<string>();

          // Add initial submitted step
          steps.push({
            id: 'start',
            name: 'Submitted',
            type: 'start'
          });

          // Follow the workflow path
          while (currentNodeId && !visited.has(currentNodeId)) {
            visited.add(currentNodeId);
            
            // Find the next edge from current node
            const nextEdge = edges.find((e: any) => e.source === currentNodeId);
            
            if (!nextEdge) break;
            
            const nextNodeId = nextEdge.target;
            const nextNode = activeWorkflow.nodes.find((n: any) => n.id === nextNodeId);
            
            if (!nextNode) break;

            console.log('[ApprovalWorkflow] Processing node:', nextNode);

            // Add approval nodes to steps (skip requester role)
            if (nextNode.type === 'approval') {
              // Try multiple places where the role name might be stored
              const stepName = nextNode.label || nextNode.data?.label || nextNode.data?.roleName || 'Approval';
              
              // Skip roles that are for requesters (they don't approve, they just create)
              const isRequesterRole = stepName.toLowerCase().includes('requester') || 
                                     stepName.toLowerCase().includes('creator');
              
              if (!isRequesterRole) {
                console.log('[ApprovalWorkflow] Adding approval step:', stepName);
                
                steps.push({
                  id: nextNode.id,
                  name: stepName,
                  roleName: nextNode.data?.roleName || nextNode.label,
                  type: 'approval'
                });
              } else {
                console.log('[ApprovalWorkflow] Skipping requester role:', stepName);
              }
            } else if (nextNode.type === 'end') {
              steps.push({
                id: 'approved',
                name: 'Approved',
                type: 'end'
              });
              break;
            }
            
            currentNodeId = nextNodeId;
          }

          // If no end node was found, add it
          if (!steps.find(s => s.type === 'end')) {
            steps.push({
              id: 'approved',
              name: 'Approved',
              type: 'end'
            });
          }

          console.log('[ApprovalWorkflow] Final steps:', steps);

          setWorkflowSteps(steps);

          // Determine current step based on execution state
          if (workflowExecutionId) {
            const execResponse = await fetch(`/api/executions/${workflowExecutionId}`);
            if (execResponse.ok) {
              const execution = await execResponse.json();
              const currentNodeId = execution.currentNodeId;
              console.log('[ApprovalWorkflow] Execution current node:', currentNodeId);
              
              const currentIndex = steps.findIndex((s: WorkflowStep) => s.id === currentNodeId);
              console.log('[ApprovalWorkflow] Current step index from execution:', currentIndex);
              setCurrentStepIndex(currentIndex >= 0 ? currentIndex : 0);
            } else {
              console.log('[ApprovalWorkflow] Failed to fetch execution, using status-based detection');
              // Fallback to status-based detection
              setCurrentStepFromStatus(steps);
            }
          } else {
            console.log('[ApprovalWorkflow] No execution ID, using status-based detection');
            setCurrentStepFromStatus(steps);
          }

          setLoading(false);
          return;
        }

        throw new Error('No active workflow found');
      } catch (error) {
        console.error('Error fetching workflow:', error);
        
        // No fallback - custom workflow is required
        setWorkflowSteps([]);
        setWorkflowName('No Workflow Configured');
        setLoading(false);
      }
    };

    const setCurrentStepFromStatus = (steps: WorkflowStep[]) => {
      console.log('[ApprovalWorkflow] Current status:', currentStatus);
      console.log('[ApprovalWorkflow] Available steps:', steps.map(s => ({ name: s.name, roleName: s.roleName, type: s.type })));
      
      // Map status to step index
      if (currentStatus === 'submitted') {
        // When status is submitted, the request has been created and is waiting for first approver
        // So we should show "Submitted" as completed and first approval step as current
        console.log('[ApprovalWorkflow] Status is submitted, setting to first approval step');
        const firstApprovalIndex = steps.findIndex(s => s.type === 'approval');
        setCurrentStepIndex(firstApprovalIndex >= 0 ? firstApprovalIndex : 1);
      } else if (currentStatus === 'approved') {
        console.log('[ApprovalWorkflow] Status is approved, setting to last step');
        setCurrentStepIndex(steps.length - 1);
      } else {
        // For legacy statuses like "manager_review", default to first approval step
        // since the custom workflow doesn't use these status names
        console.log('[ApprovalWorkflow] Legacy status detected, defaulting to first approval step');
        const firstApprovalIndex = steps.findIndex(s => s.type === 'approval');
        console.log('[ApprovalWorkflow] First approval step index:', firstApprovalIndex);
        setCurrentStepIndex(firstApprovalIndex >= 0 ? firstApprovalIndex : 1);
      }
    };

    fetchWorkflowSteps();
  }, [workflowExecutionId, requestId, currentStatus]);

  // Check if current status is a query status
  const isQueryStatus = ['sop_query', 'budget_query', 'query_required', 'department_checks'].includes(currentStatus);

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

  if (workflowSteps.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Approval Workflow</h3>
          <p className="mt-1 text-sm text-gray-500">No workflow configured</p>
        </div>
        <div className="border-t border-gray-200 px-4 py-8">
          <div className="text-center">
            <p className="text-gray-600 mb-4">No active workflow found for this request.</p>
            <p className="text-sm text-gray-500">Please contact your administrator to configure a workflow.</p>
          </div>
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
          {workflowSteps.length > 0 && (
            <div className="text-xs text-gray-500">
              {workflowSteps.length} steps
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
        {/* Show queries status if applicable */}
        {isQueryStatus && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-medium text-yellow-800">Query Pending</h4>
                <p className="text-sm text-yellow-700">
                  {String(currentStatus) === 'query_required' && 'Waiting for response from Requester'}
                  {String(currentStatus) === 'department_checks' && 'Waiting for department response'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col">
          {/* Desktop view - Flowchart style */}
          <div className="hidden md:block">
            <div className="relative py-8">
              {/* Progress line background - positioned to go through boxes */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 transform -translate-y-1/2" style={{ left: '5%', right: '5%' }}>
                <div 
                  className="h-full bg-green-500 transition-all duration-500" 
                  style={{ width: `${Math.max(0, Math.min(100, (currentStepIndex / (workflowSteps.length - 1)) * 100))}%` }}
                ></div>
              </div>
              
              {/* Workflow steps */}
              <div className="relative flex justify-between items-center px-8">
                {workflowSteps.map((step, index) => {
                  const isCompleted = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  
                  return (
                    <div key={step.id} className="flex flex-col items-center relative z-10" style={{ flex: 1, maxWidth: '120px' }}>
                      {/* Step box with integrated indicator */}
                      <div className={`relative text-center px-3 py-2 rounded-lg min-h-[60px] flex flex-col items-center justify-center w-full transition-all duration-300 ${
                        isCurrent ? 'bg-blue-600 text-white shadow-lg scale-105' : 
                        isCompleted ? 'bg-green-500 text-white shadow-md' : 
                        'bg-white text-gray-700 border-2 border-gray-300'
                      }`}>
                        {/* Step indicator icon/number at top */}
                        <div className="mb-1">
                          {isCompleted ? (
                            <svg className="w-4 h-4 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : isCurrent ? (
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse mx-auto"></div>
                          ) : (
                            <span className="text-sm font-bold">{index + 1}</span>
                          )}
                        </div>
                        
                        {/* Step name */}
                        <span className="text-xs font-semibold block leading-tight">
                          {step.name}
                        </span>
                        
                        {/* Active badge */}
                        {isCurrent && (
                          <span className="text-[10px] font-medium mt-0.5 block opacity-90">● Active</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Mobile view - vertical list */}
          <div className="md:hidden space-y-3">
            {workflowSteps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              
              return (
                <div key={step.id} className="flex items-start">
                  <div className="flex flex-col items-center mr-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      getStatusBadgeClass(step.id, isCurrent, isCompleted)
                    } ${isCurrent ? 'ring-4 ring-blue-200' : ''}`}>
                      {isCompleted ? (
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : isCurrent ? (
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                      ) : (
                        <span className="text-xs font-medium">{index + 1}</span>
                      )}
                    </div>
                    {index < workflowSteps.length - 1 && (
                      <div className={`w-0.5 h-12 mt-1 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    )}
                  </div>
                  <div className={`flex-1 py-2 px-3 rounded-lg ${
                    isCurrent ? 'bg-blue-50 border-2 border-blue-500' : 
                    isCompleted ? 'bg-green-50 border border-green-200' : 
                    'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${
                        isCurrent ? 'text-blue-700' : 
                        isCompleted ? 'text-green-700' : 
                        'text-gray-600'
                      }`}>
                        {step.name}
                      </span>
                      {isCurrent && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 mt-1 block">Step {index + 1} of {workflowSteps.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Current status information */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-900">Current Stage</h3>
                <div className="mt-2 text-sm text-blue-800">
                  <p className="font-semibold">
                    {workflowSteps[currentStepIndex]?.name || 'Processing'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Step {currentStepIndex + 1} of {workflowSteps.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalWorkflow;
