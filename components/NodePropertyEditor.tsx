'use client';

import React, { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';

interface Role {
  _id: string;
  name: string;
}

interface Group {
  _id: string;
  name: string;
  type: string;
  description?: string;
}

interface NodePropertyEditorProps {
  selectedNode: Node | null;
  companyId: string;
  onUpdateNode: (nodeId: string, updates: any) => void;
  onDeleteNode: (nodeId: string) => void;
}

export default function NodePropertyEditor({
  selectedNode,
  companyId,
  onUpdateNode,
  onDeleteNode,
}: NodePropertyEditorProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [localData, setLocalData] = useState<any>({});

  useEffect(() => {
    if (selectedNode) {
      console.log('NodePropertyEditor: Selected node changed:', selectedNode);
      setLocalData(selectedNode.data || {});
      fetchRoles();
      fetchGroups();
    }
  }, [selectedNode, companyId]);

  const fetchRoles = async () => {
    try {
      console.log('NodePropertyEditor: Fetching roles...');
      const response = await fetch('/api/roles');
      if (response.ok) {
        const data = await response.json();
        console.log('NodePropertyEditor: Roles fetched:', data);
        // Roles API returns array directly, not wrapped in an object
        setRoles(Array.isArray(data) ? data : []);
      } else {
        console.error('NodePropertyEditor: Failed to fetch roles, status:', response.status);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const fetchGroups = async () => {
    try {
      console.log('NodePropertyEditor: Fetching groups...');
      const response = await fetch('/api/groups');
      if (response.ok) {
        const data = await response.json();
        console.log('NodePropertyEditor: Groups fetched:', data);
        setGroups(data.groups || []);
      } else {
        console.error('NodePropertyEditor: Failed to fetch groups, status:', response.status);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDataChange = (key: string, value: any) => {
    const newData = { ...localData, [key]: value };
    setLocalData(newData);
    if (selectedNode) {
      onUpdateNode(selectedNode.id, newData);
    }
  };

  const handleGroupScopeChange = (updates: any) => {
    const currentGroupScope = localData.groupScope || {};
    const newGroupScope = { ...currentGroupScope, ...updates };
    handleDataChange('groupScope', newGroupScope);
  };

  const handleGroupToggle = (groupId: string) => {
    const currentGroupScope = localData.groupScope || {};
    const currentGroupIds = currentGroupScope.groupIds || [];
    
    const newGroupIds = currentGroupIds.includes(groupId)
      ? currentGroupIds.filter((id: string) => id !== groupId)
      : [...currentGroupIds, groupId];
    
    handleGroupScopeChange({ groupIds: newGroupIds });
  };

  if (!selectedNode) {
    return null;
  }

  const groupsByType = groups.reduce((acc, group) => {
    if (!acc[group.type]) {
      acc[group.type] = [];
    }
    acc[group.type].push(group);
    return acc;
  }, {} as Record<string, Group[]>);

  const selectedGroupIds = (localData.groupScope?.groupIds || []).map((id: any) => id.toString());
  const groupScopeEnabled = localData.groupScope?.enabled || false;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            Edit {selectedNode.type === 'approval' ? 'User' : (selectedNode.type ? selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1) : 'Node')} Node
          </h2>
          <button
            onClick={() => onUpdateNode(selectedNode.id, null)} // This will close the editor
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Node Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Node Label
            </label>
            <input
              type="text"
              value={localData.label || ''}
              onChange={(e) => handleDataChange('label', e.target.value)}
              placeholder="Enter node label"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={localData.description || ''}
              onChange={(e) => handleDataChange('description', e.target.value)}
              placeholder="Enter node description"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Role Selection (for approval nodes) */}
          {selectedNode.type === 'approval' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned Role *
              </label>
              <select
                value={localData.roleId ? localData.roleId.toString() : ''}
                onChange={(e) => handleDataChange('roleId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a role</option>
                {roles.map(role => (
                  <option key={role._id} value={role._id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Users with this role will be able to approve at this step
              </p>
            </div>
          )}

          {/* Group Scope Configuration (for approval nodes) */}
          {selectedNode.type === 'approval' && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Group Scope</h3>
                  <p className="text-sm text-gray-500">
                    Restrict this approval step to users in specific groups
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableGroupScope"
                    checked={groupScopeEnabled}
                    onChange={(e) => handleGroupScopeChange({ enabled: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableGroupScope" className="ml-2 text-sm text-gray-700">
                    Enable group scope
                  </label>
                </div>
              </div>

              {groupScopeEnabled && (
                <div className="space-y-4">
                  {/* Match Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Match Type
                    </label>
                    <select
                      value={localData.groupScope?.matchType || 'any'}
                      onChange={(e) => handleGroupScopeChange({ matchType: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="any">Any - User must be in at least one selected group</option>
                      <option value="all">All - User must be in all selected groups</option>
                    </select>
                  </div>

                  {/* Group Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Groups
                    </label>
                    {loading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-4 space-y-4">
                        {Object.entries(groupsByType).map(([type, typeGroups]) => (
                          <div key={type}>
                            <h4 className="text-sm font-medium text-gray-800 mb-2 capitalize">
                              {type.replace('_', ' ')}
                            </h4>
                            <div className="space-y-2 ml-4">
                              {typeGroups.map(group => (
                                <div key={group._id} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    id={`group-${group._id}`}
                                    checked={selectedGroupIds.includes(group._id)}
                                    onChange={() => handleGroupToggle(group._id)}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                  />
                                  <label htmlFor={`group-${group._id}`} className="ml-2 text-sm text-gray-700">
                                    {group.name}
                                    {group.description && (
                                      <span className="text-gray-500"> - {group.description}</span>
                                    )}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {groups.length === 0 && (
                          <div className="text-center py-4 text-gray-500">
                            No groups available. Create groups first to use group scope.
                          </div>
                        )}
                      </div>
                    )}

                    {selectedGroupIds.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600">
                          Selected {selectedGroupIds.length} group(s)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Group Scope Preview */}
                  {selectedGroupIds.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-blue-800 mb-1">Group Scope Preview</h4>
                      <p className="text-xs text-blue-700">
                        Only users with the selected role AND who belong to{' '}
                        {localData.groupScope?.matchType === 'all' ? 'ALL' : 'ANY'} of the selected groups
                        will be able to approve at this step. The system will automatically route requests
                        to the appropriate approvers based on the requester's group memberships.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Group Configuration (for grouping nodes) */}
          {selectedNode.type === 'grouping' && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Group Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Type
                  </label>
                  <select
                    value={localData.groupType || 'region'}
                    onChange={(e) => handleDataChange('groupType', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="region">Region</option>
                    <option value="department">Department</option>
                    <option value="cost_center">Cost Center</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      value={localData.width || 300}
                      onChange={(e) => handleDataChange('width', parseInt(e.target.value))}
                      min="200"
                      max="800"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      value={localData.height || 200}
                      onChange={(e) => handleDataChange('height', parseInt(e.target.value))}
                      min="150"
                      max="600"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localData.borderColor || '#3b82f6'}
                      onChange={(e) => {
                        const color = e.target.value;
                        handleDataChange('borderColor', color);
                        // Convert hex to rgba with low opacity for background
                        const r = parseInt(color.slice(1, 3), 16);
                        const g = parseInt(color.slice(3, 5), 16);
                        const b = parseInt(color.slice(5, 7), 16);
                        handleDataChange('backgroundColor', `rgba(${r}, ${g}, ${b}, 0.05)`);
                      }}
                      className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">
                      {localData.borderColor || '#3b82f6'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SubGroup Configuration (for subgroup nodes) */}
          {selectedNode.type === 'subgroup' && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">SubGroup Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SubGroup Type
                  </label>
                  <select
                    value={localData.subGroupType || 'department'}
                    onChange={(e) => handleDataChange('subGroupType', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="department">Department</option>
                    <option value="team">Team</option>
                    <option value="division">Division</option>
                    <option value="unit">Unit</option>
                    <option value="section">Section</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nesting Level
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={localData.level || 1}
                      onChange={(e) => {
                        const level = Math.max(1, Math.min(5, parseInt(e.target.value) || 1));
                        handleDataChange('level', level);
                        // Update visual properties based on level
                        const newWidth = Math.max(200, 300 - (level * 25));
                        const newHeight = Math.max(120, 200 - (level * 25));
                        const newBgColor = `rgba(139, 69, 19, ${0.03 + (level * 0.02)})`;
                        handleDataChange('width', newWidth);
                        handleDataChange('height', newHeight);
                        handleDataChange('backgroundColor', newBgColor);
                      }}
                      min="1"
                      max="5"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <span className="text-sm text-gray-600">
                      (1-5, higher = more nested)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Level {localData.level || 1}: {
                      (localData.level || 1) === 1 ? 'Direct child of main group' :
                      (localData.level || 1) === 2 ? 'Nested within another subgroup' :
                      (localData.level || 1) === 3 ? 'Deeply nested subgroup' :
                      'Very deeply nested subgroup'
                    }
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      value={localData.width || 250}
                      onChange={(e) => handleDataChange('width', parseInt(e.target.value))}
                      min="150"
                      max="600"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      value={localData.height || 150}
                      onChange={(e) => handleDataChange('height', parseInt(e.target.value))}
                      min="100"
                      max="400"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Border Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localData.borderColor || '#8b4513'}
                      onChange={(e) => {
                        const color = e.target.value;
                        handleDataChange('borderColor', color);
                        // Convert hex to rgba with level-based opacity for background
                        const r = parseInt(color.slice(1, 3), 16);
                        const g = parseInt(color.slice(3, 5), 16);
                        const b = parseInt(color.slice(5, 7), 16);
                        const level = localData.level || 1;
                        handleDataChange('backgroundColor', `rgba(${r}, ${g}, ${b}, ${0.03 + (level * 0.02)})`);
                      }}
                      className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">
                      {localData.borderColor || '#8b4513'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parent Group ID
                  </label>
                  <input
                    type="text"
                    value={localData.parentGroupId || ''}
                    onChange={(e) => handleDataChange('parentGroupId', e.target.value)}
                    placeholder="Optional: ID of parent group"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty for auto-detection or specify parent group ID
                  </p>
                </div>

                {/* Visual hierarchy preview */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-orange-800 mb-2">Hierarchy Preview</h4>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-orange-700">Nesting:</span>
                    {Array.from({ length: localData.level || 1 }, (_, i) => (
                      <div key={i} className="w-2 h-4 bg-orange-400 rounded-full opacity-60" />
                    ))}
                    <span className="text-xs text-orange-600 ml-2">
                      Level {localData.level || 1}
                    </span>
                  </div>
                  <p className="text-xs text-orange-600 mt-1">
                    This subgroup can contain workflow nodes and level {(localData.level || 1) + 1} subgroups
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={() => onDeleteNode(selectedNode.id)}
            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
          >
            Delete Node
          </button>
          <button
            onClick={() => onUpdateNode(selectedNode.id, null)} // This will close the editor
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}