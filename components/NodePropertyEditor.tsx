'use client';

import React, { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';

interface NodePropertyEditorProps {
  selectedNode: Node | null;
  companyId: string;
  onUpdateNode: (nodeId: string, data: Record<string, any>) => void;
  onDeleteNode: (nodeId: string) => void;
}

interface CustomRole {
  _id: string;
  name: string;
  description?: string;
  company?: string;
  isSystemAdmin?: boolean;
  permissions?: {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canShare: boolean;
    canDownload: boolean;
    canForward: boolean;
    canManageBudget: boolean;
    canESign: boolean;
    canApprove: boolean;
    canRaiseQueries: boolean;
  };
}

interface Condition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
  value: any;
}

const NodePropertyEditor: React.FC<NodePropertyEditorProps> = ({
  selectedNode,
  companyId,
  onUpdateNode,
  onDeleteNode,
}) => {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [condition, setCondition] = useState<Condition>({
    field: '',
    operator: 'eq',
    value: '',
  });

  // Fetch roles when component mounts
  // Note: companyId prop is kept for backwards compatibility but not used
  // The /api/roles endpoint automatically filters by the authenticated user's company
  useEffect(() => {
    const fetchRoles = async () => {
      setIsLoadingRoles(true);
      try {
        const response = await fetch('/api/roles', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched roles for workflow:', data);
          setRoles(data);
        } else {
          console.error('Failed to fetch roles, status:', response.status);
        }
      } catch (error) {
        console.error('Failed to fetch roles:', error);
      } finally {
        setIsLoadingRoles(false);
      }
    };

    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update local state when selected node changes
  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data?.label || '');
      setDescription(selectedNode.data?.description || '');
      setSelectedRoleId(selectedNode.data?.roleId || '');
      
      if (selectedNode.data?.condition) {
        setCondition(selectedNode.data.condition);
      } else {
        setCondition({ field: '', operator: 'eq', value: '' });
      }
    }
  }, [selectedNode]);

  // Handle property updates
  const handleUpdate = () => {
    if (!selectedNode) return;

    const updatedData: Record<string, any> = {
      ...selectedNode.data,
      label,
      description,
    };

    // Add role-specific data for approval nodes
    if (selectedNode.type === 'approval') {
      updatedData.roleId = selectedRoleId;
      const role = roles.find(r => r._id === selectedRoleId);
      updatedData.roleName = role?.name || '';
    }

    // Add condition data for conditional nodes
    if (selectedNode.type === 'conditional') {
      updatedData.condition = condition;
    }

    onUpdateNode(selectedNode.id, updatedData);
  };

  // Handle node deletion
  const handleDelete = () => {
    if (!selectedNode) return;
    
    if (window.confirm(`Are you sure you want to delete this ${nodeTypeLabels[selectedNode.type || '']}?`)) {
      onDeleteNode(selectedNode.id);
    }
  };

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-2 text-sm">Select a node to edit its properties</p>
        </div>
      </div>
    );
  }

  const nodeTypeLabels: Record<string, string> = {
    start: 'Start Node',
    end: 'End Node',
    approval: 'User Node',
    parallel_split: 'Parallel Split Node',
    parallel_join: 'Parallel Join Node',
    conditional: 'Conditional Node',
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Node Properties</h2>
        <p className="text-sm text-gray-500 mt-1">
          {nodeTypeLabels[selectedNode.type || ''] || 'Unknown Node'}
        </p>
      </div>

      <div className="space-y-4">
        {/* Label field - for all nodes */}
        <div>
          <label htmlFor="node-label" className="block text-sm font-medium text-gray-700 mb-1">
            Label
          </label>
          <input
            id="node-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="Enter node label"
          />
        </div>

        {/* Description field - for all nodes */}
        <div>
          <label htmlFor="node-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="node-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="Enter node description"
          />
        </div>

        {/* Role selector - only for approval nodes */}
        {selectedNode.type === 'approval' && (
          <div>
            <label htmlFor="node-role" className="block text-sm font-medium text-gray-700 mb-1">
              Required Role
            </label>
            {isLoadingRoles ? (
              <div className="text-sm text-gray-500">Loading roles...</div>
            ) : (
              <select
                id="node-role"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role._id} value={role._id}>
                    {role.name}
                  </option>
                ))}
              </select>
            )}
            {roles.length === 0 && !isLoadingRoles && (
              <p className="mt-1 text-xs text-gray-500">
                No roles available. Create roles first.
              </p>
            )}
          </div>
        )}

        {/* Condition editor - only for conditional nodes */}
        {selectedNode.type === 'conditional' && (
          <div className="space-y-3">
            <div>
              <label htmlFor="condition-field" className="block text-sm font-medium text-gray-700 mb-1">
                Field
              </label>
              <input
                id="condition-field"
                type="text"
                value={condition.field}
                onChange={(e) => setCondition({ ...condition, field: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="e.g., costEstimate"
              />
            </div>

            <div>
              <label htmlFor="condition-operator" className="block text-sm font-medium text-gray-700 mb-1">
                Operator
              </label>
              <select
                id="condition-operator"
                value={condition.operator}
                onChange={(e) => setCondition({ ...condition, operator: e.target.value as Condition['operator'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="eq">Equals (=)</option>
                <option value="ne">Not Equals (≠)</option>
                <option value="gt">Greater Than (&gt;)</option>
                <option value="gte">Greater Than or Equal (≥)</option>
                <option value="lt">Less Than (&lt;)</option>
                <option value="lte">Less Than or Equal (≤)</option>
                <option value="contains">Contains</option>
              </select>
            </div>

            <div>
              <label htmlFor="condition-value" className="block text-sm font-medium text-gray-700 mb-1">
                Value
              </label>
              <input
                id="condition-value"
                type="text"
                value={condition.value}
                onChange={(e) => setCondition({ ...condition, value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Enter comparison value"
              />
            </div>
          </div>
        )}

        {/* Update button */}
        <div className="pt-4 space-y-2">
          <button
            onClick={handleUpdate}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Update Properties
          </button>
          
          <button
            onClick={handleDelete}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete Node
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodePropertyEditor;
