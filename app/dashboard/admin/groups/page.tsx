'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Group {
  _id: string;
  name: string;
  type: string;
  description?: string;
  parentGroupId?: string;
  isActive: boolean;
  memberCount?: number;
  createdAt: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  empId: string;
}

interface GroupMember {
  userId: string;
  name: string;
  email: string;
  empId: string;
  assignedAt: string;
}

export default function GroupsAdminPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'department' as 'region' | 'department' | 'cost_center' | 'custom',
    description: '',
    parentGroupId: '',
  });

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`);
      if (response.ok) {
        const data = await response.json();
        setGroupMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch group members:', err);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      type: 'department',
      description: '',
      parentGroupId: '',
    });
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleEdit = (group: Group) => {
    setFormData({
      name: group.name,
      type: group.type as any,
      description: group.description || '',
      parentGroupId: group.parentGroupId || '',
    });
    setSelectedGroup(group);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleSave = async () => {
    try {
      setError('');
      setSuccess('');

      const method = isCreating ? 'POST' : 'PUT';
      const url = isCreating ? '/api/groups' : `/api/groups/${selectedGroup?._id}`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(`Group ${isCreating ? 'created' : 'updated'} successfully`);
        setIsCreating(false);
        setIsEditing(false);
        setSelectedGroup(null);
        fetchGroups();
      } else {
        const data = await response.json();
        setError(data.error || `Failed to ${isCreating ? 'create' : 'update'} group`);
      }
    } catch (err) {
      setError(`An error occurred while ${isCreating ? 'creating' : 'updating'} the group`);
    }
  };

  const handleDelete = async (group: Group) => {
    if (!confirm(`Are you sure you want to delete the group "${group.name}"?`)) return;

    try {
      const response = await fetch(`/api/groups/${group._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Group deleted successfully');
        fetchGroups();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete group');
      }
    } catch (err) {
      setError('An error occurred while deleting the group');
    }
  };

  const handleShowMembers = (group: Group) => {
    setSelectedGroup(group);
    setShowMembers(true);
    fetchGroupMembers(group._id);
  };

  const handleAddMembers = async (groupId: string, userIds: string[]) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds }),
      });

      if (response.ok) {
        setSuccess('Members added successfully');
        fetchGroupMembers(groupId);
        fetchGroups(); // Refresh to update member counts
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add members');
      }
    } catch (err) {
      setError('An error occurred while adding members');
    }
  };

  const handleRemoveMember = async (groupId: string, userId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Member removed successfully');
        fetchGroupMembers(groupId);
        fetchGroups(); // Refresh to update member counts
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to remove member');
      }
    } catch (err) {
      setError('An error occurred while removing member');
    }
  };

  const groupsByType = groups.reduce((acc, group) => {
    if (!acc[group.type]) {
      acc[group.type] = [];
    }
    acc[group.type].push(group);
    return acc;
  }, {} as Record<string, Group[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Members Modal
  if (showMembers && selectedGroup) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => {
              setShowMembers(false);
              setSelectedGroup(null);
            }}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to groups
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Members of {selectedGroup.name}</h2>
              <p className="text-gray-600">{groupMembers.length} members</p>
            </div>
            <button
              onClick={() => {
                const availableUsers = users.filter(user => 
                  !groupMembers.some(member => member.userId === user._id)
                );
                if (availableUsers.length === 0) {
                  setError('No available users to add');
                  return;
                }
                // Simple bulk add - in a real app, you'd want a proper selection UI
                const userIds = availableUsers.slice(0, 5).map(u => u._id);
                handleAddMembers(selectedGroup._id, userIds);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Add Members
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groupMembers.map((member) => (
                  <tr key={member.userId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {member.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.empId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRemoveMember(selectedGroup._id, member.userId)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {groupMembers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No members in this group</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Create/Edit Form
  if (isCreating || isEditing) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => {
              setIsCreating(false);
              setIsEditing(false);
              setSelectedGroup(null);
            }}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to groups
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6">
            {isCreating ? 'Create New Group' : 'Edit Group'}
          </h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter group name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="region">Region</option>
                <option value="department">Department</option>
                <option value="cost_center">Cost Center</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Group
              </label>
              <select
                value={formData.parentGroupId}
                onChange={(e) => setFormData({ ...formData, parentGroupId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No parent group</option>
                {groups
                  .filter(g => g._id !== selectedGroup?._id) // Don't allow self-reference
                  .map(group => (
                    <option key={group._id} value={group._id}>
                      {group.name} ({group.type})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter group description"
              />
            </div>

            <div className="flex items-center justify-end gap-4 pt-6 border-t">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                  setSelectedGroup(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {isCreating ? 'Create Group' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Group Management</h1>
          <p className="text-gray-600 mt-1">Organize users into groups for workflow routing</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Group
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(groupsByType).map(([type, typeGroups]) => (
          <div key={type} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h2 className="text-lg font-semibold text-gray-900 capitalize">
                {type.replace('_', ' ')} ({typeGroups.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Members
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {typeGroups.map((group) => (
                    <tr key={group._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{group.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {group.description || 'No description'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleShowMembers(group)}
                          className="text-sm text-indigo-600 hover:text-indigo-900"
                        >
                          {group.memberCount || 0} members
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {group.isActive ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(group)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(group)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {typeGroups.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No {type.replace('_', ' ')} groups created yet</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No groups</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first group.</p>
            <div className="mt-6">
              <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Group
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}