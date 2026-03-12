'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import WorkflowBuilder from '@/components/WorkflowBuilder';
import { Node, Edge } from '@xyflow/react';

export default function WorkflowBuilderPage() {
  const searchParams = useSearchParams();
  const urlWorkflowId = searchParams.get('id');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [workflowId, setWorkflowId] = useState<string | undefined>(urlWorkflowId || undefined);
  const [workflowName, setWorkflowName] = useState<string | undefined>();
  const [workflowDescription, setWorkflowDescription] = useState<string | undefined>();
  const [workflowNodes, setWorkflowNodes] = useState<Node[]>([]);
  const [workflowEdges, setWorkflowEdges] = useState<Edge[]>([]);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user || data);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  // Load existing workflow if editing, or load company's workflow if no ID provided
  useEffect(() => {
    if (!user) return;

    const loadWorkflow = async () => {
      try {
        let response;
        
        if (urlWorkflowId) {
          // Load specific workflow by ID
          console.log('Loading workflow by ID:', urlWorkflowId);
          response = await fetch(`/api/workflows/${urlWorkflowId}`, { credentials: 'include' });
        } else {
          // Load company's workflows and use the first one (or most recent)
          console.log('Loading company workflows');
          response = await fetch('/api/workflows', { credentials: 'include' });
        }

        if (response.ok) {
          const data = await response.json();
          console.log('Workflow data received:', data);
          
          if (urlWorkflowId) {
            // Single workflow loaded
            setWorkflowId(data._id);
            setWorkflowName(data.name);
            setWorkflowDescription(data.description);
            
            // Transform nodes from DB format to React Flow format
            const transformedNodes = (data.nodes || []).map((node: any) => ({
              id: node.id,
              type: node.type,
              position: node.position,
              data: {
                label: node.label,
                ...node.data, // Preserve all node data including groupScope
              },
              // Preserve parent-child relationships for grouping nodes
              ...(node.parentId && { parentId: node.parentId }),
              ...(node.extent && { extent: node.extent }),
            }));
            
            console.log('Transformed nodes:', transformedNodes);
            setWorkflowNodes(transformedNodes);
            setWorkflowEdges(data.edges || []);
          } else if (Array.isArray(data) && data.length > 0) {
            // Multiple workflows loaded, use the most recent one
            const latestWorkflow = data[0];
            console.log('Using latest workflow:', latestWorkflow.name);
            setWorkflowId(latestWorkflow._id); // Set the workflow ID from loaded data
            setWorkflowName(latestWorkflow.name);
            setWorkflowDescription(latestWorkflow.description);
            
            // Transform nodes from DB format to React Flow format
            const transformedNodes = (latestWorkflow.nodes || []).map((node: any) => ({
              id: node.id,
              type: node.type,
              position: node.position,
              data: {
                label: node.label,
                ...node.data, // Preserve all node data including groupScope
              },
              // Preserve parent-child relationships for grouping nodes
              ...(node.parentId && { parentId: node.parentId }),
              ...(node.extent && { extent: node.extent }),
            }));
            
            console.log('Transformed nodes:', transformedNodes);
            setWorkflowNodes(transformedNodes);
            setWorkflowEdges(latestWorkflow.edges || []);
          } else {
            console.log('No workflows found for company');
          }
        } else {
          console.error('Failed to load workflow, status:', response.status);
          const errorData = await response.json().catch(() => ({}));
          console.error('Error data:', errorData);
        }
      } catch (error) {
        console.error('Error loading workflow:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflow();
  }, [urlWorkflowId, user]);

  const handleSave = async (workflow: {
    name: string;
    description?: string;
    nodes: Node[];
    edges: Edge[];
  }) => {
    try {
      // Transform nodes to match the database schema
      // React Flow stores label in data.label, but DB expects it at node level
      const transformedNodes = workflow.nodes.map(node => ({
        id: node.id,
        type: node.type,
        label: node.data?.label || node.type || 'Untitled',
        position: node.position,
        data: {
          ...node.data, // Preserve all node data including groupScope and grouping properties
        },
        // Preserve parent-child relationships for grouping nodes
        ...(node.parentId && { parentId: node.parentId }),
        ...(node.extent && { extent: node.extent }),
      }));

      const workflowData = {
        name: workflow.name,
        description: workflow.description,
        nodes: transformedNodes,
        edges: workflow.edges,
      };

      let response;
      
      if (workflowId) {
        // Update existing workflow
        response = await fetch(`/api/workflows/${workflowId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(workflowData),
        });
      } else {
        // Create new workflow
        response = await fetch('/api/workflows', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(workflowData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Workflow save error response:', errorData);
        
        // Create a detailed error with validation errors attached
        if (errorData.validationErrors && Array.isArray(errorData.validationErrors)) {
          const error: any = new Error('Validation error');
          error.validationErrors = errorData.validationErrors;
          throw error;
        }
        
        const errorMessage = errorData.error || 'Failed to save workflow';
        throw new Error(errorMessage);
      }

      const savedWorkflow = await response.json();
      console.log('Workflow saved successfully:', savedWorkflow);
      
      // Update workflow ID if this was a new workflow
      if (!workflowId && savedWorkflow._id) {
        setWorkflowId(savedWorkflow._id);
      }
      
      // Update workflow name if it changed
      if (savedWorkflow.name !== workflowName) {
        setWorkflowName(savedWorkflow.name);
      }
    } catch (error: any) {
      console.error('Failed to save workflow:', error);
      throw error; // Re-throw to let WorkflowBuilder handle the error display
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <WorkflowBuilder
      companyId={user.companyId}
      workflowId={workflowId || undefined}
      workflowName={workflowName}
      initialNodes={workflowNodes}
      initialEdges={workflowEdges}
      initialDescription={workflowDescription}
      onSave={handleSave}
    />
  );
}
