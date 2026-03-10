'use client';

import { useState, useEffect } from 'react';
import { TagIcon, PencilIcon, TrashIcon, UsersIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface CustomRole {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface RoleWithUsage extends CustomRole {
  isInUse?: boolean;
}

interface User {
  _id: string;
  name: string;
  email: string;
  empId: string;
}

interface AssignedUser extends User {
  assignedAt?: string;
}

interface RoleManagementProps {
  companyId: string;
}

/**
 * RoleManagement Component
 * 
 * Manages custom workflow roles for a company, including viewing, creating, editing, deleting roles,
 * and assigning users to roles.
 * 
 * Requirements:
 * - 1.1: Provides role management interface for System Admins
 * - 1.2: Stores role with unique identifier and company association
 * - 1.3: Update role name and trigger workflow reference updates
 * - 1.4: Prevent deletion if role is used in any active workflow
 * - 1.5: Allow System Admin to view all roles defined for their company
 * - 10.1: List users in company and assign users to roles
 * - 10.2: Remove users from roles
 * 
 * Features:
 * - Displays role list with name, description, and usage indicators
 * - Role creation form with name (required) and description (optional)
 * - Role edit functionality with pre-filled data
 * - Role deletion with confirmation dialog and protection for roles in use
 * - User assignment interface with modal dialog
 * - List users currently assigned to a role
 * - Search and assign users from company to roles
 * - Remove users from roles
 * - Form validation and error handling
 * - Success feedback (refreshes list after creation/update/deletion)
 * - Loading and error states
 */
export default function RoleManagement({ companyId }: RoleManagementProps) {
  const [roles, setRoles] = useState<RoleWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<CustomRole | null>(null);
  
  // User assignment state
  const [managingUsersRole, setManagingUsersRole] = useState<CustomRole | null>(null);
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [userManagementError, setUserManagementError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      fetchRoles();
    }
  }, [companyId]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/roles/company/${companyId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }

      const data = await response.json();
      setRoles(data);
    } catch (err: any) {
      console.error('Error fetching roles:', err);
      setError(err.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form (client-side validation in addition to HTML5 required)
    if (!formData.name.trim()) {
      setFormError('Role name is required');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create role');
      }

      // Success - reset form and refresh list
      setFormData({ name: '', description: '' });
      setShowCreateForm(false);
      await fetchRoles();
    } catch (err: any) {
      console.error('Error creating role:', err);
      setFormError(err.message || 'Failed to create role');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingRole) return;

    // Validate form
    if (!formData.name.trim()) {
      setFormError('Role name is required');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const response = await fetch(`/api/roles/${editingRole._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update role');
      }

      // Success - reset form and refresh list
      setFormData({ name: '', description: '' });
      setEditingRole(null);
      await fetchRoles();
    } catch (err: any) {
      console.error('Error updating role:', err);
      setFormError(err.message || 'Failed to update role');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStartEdit = (role: CustomRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
    });
    setFormError(null);
    setShowCreateForm(false);
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '' });
    setFormError(null);
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setFormData({ name: '', description: '' });
    setFormError(null);
  };

  const handleDeleteClick = (role: CustomRole) => {
    setRoleToDelete(role);
  };

  const handleCancelDelete = () => {
    setRoleToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;

    try {
      setDeletingRoleId(roleToDelete._id);

      const response = await fetch(`/api/roles/${roleToDelete._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete role');
      }

      // Success - close dialog and refresh list
      setRoleToDelete(null);
      await fetchRoles();
    } catch (err: any) {
      console.error('Error deleting role:', err);
      // Show error in the confirmation dialog
      alert(err.message || 'Failed to delete role');
    } finally {
      setDeletingRoleId(null);
    }
  };

  // User assignment functions
  const handleManageUsers = async (role: CustomRole) => {
    setManagingUsersRole(role);
    setUserSearchQuery('');
    setUserManagementError(null);
    await fetchRoleUsers(role._id);
    await fetchAllCompanyUsers();
  };

  const handleCloseUserManagement = () => {
    setManagingUsersRole(null);
    setAssignedUsers([]);
    setAllUsers([]);
    setUserSearchQuery('');
    setUserManagementError(null);
  };

  const fetchRoleUsers = async (roleId: string) => {
    try {
      setLoadingUsers(true);
      const response = await fetch(`/api/roles/${roleId}/users`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assigned users');
      }

      const data = await response.json();
      setAssignedUsers(data);
    } catch (err: any) {
      console.error('Error fetching role users:', err);
      setUserManagementError(err.message || 'Failed to load assigned users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAllCompanyUsers = async () => {
    try {
      const response = await fetch(`/api/users/company/${companyId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch company users');
      }

      const data = await response.json();
      setAllUsers(data);
    } catch (err: any) {
      console.error('Error fetching company users:', err);
      setUserManagementError(err.message || 'Failed to load company users');
    }
  };

  const handleAssignUser = async (userId: string) => {
    if (!managingUsersRole) return;

    try {
      setAssigningUserId(userId);
      setUserManagementError(null);

      const response = await fetch(`/api/roles/${managingUsersRole._id}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign user');
      }

      // Refresh assigned users list
      await fetchRoleUsers(managingUsersRole._id);
    } catch (err: any) {
      console.error('Error assigning user:', err);
      setUserManagementError(err.message || 'Failed to assign user');
    } finally {
      setAssigningUserId(null);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!managingUsersRole) return;

    try {
      setRemovingUserId(userId);
      setUserManagementError(null);

      const response = await fetch(`/api/roles/${managingUsersRole._id}/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove user');
      }

      // Refresh assigned users list
      await fetchRoleUsers(managingUsersRole._id);
    } catch (err: any) {
      console.error('Error removing user:', err);
      setUserManagementError(err.message || 'Failed to remove user');
    } finally {
      setRemovingUserId(null);
    }
  };

  // Filter available users (not already assigned)
  const availableUsers = allUsers.filter(
    (user) => !assignedUsers.some((assigned) => assigned._id === user._id)
  );

  // Filter users based on search query
  const filteredAvailableUsers = availableUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.empId.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">Error: {error}</p>
        <button
          onClick={fetchRoles}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Custom Workflow Roles</h2>
          <p className="text-gray-600 mt-1">
            Manage roles for your company's approval workflows
          </p>
        </div>
        {!showCreateForm && !editingRole && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Create Role
          </button>
        )}
      </div>

      {/* Role Creation Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Role</h3>
          
          <form onSubmit={handleCreateRole}>
            <div className="space-y-4">
              {/* Name Field */}
              <div>
                <label htmlFor="roleName" className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="roleName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Finance Manager, Department Head"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={formSubmitting}
                />
              </div>

              {/* Description Field */}
              <div>
                <label htmlFor="roleDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="roleDescription"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description of this role's responsibilities"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={formSubmitting}
                />
              </div>

              {/* Error Message */}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{formError}</p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formSubmitting ? 'Creating...' : 'Submit'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Role Edit Form */}
      {editingRole && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Role</h3>
          
          <form onSubmit={handleEditRole}>
            <div className="space-y-4">
              {/* Name Field */}
              <div>
                <label htmlFor="editRoleName" className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="editRoleName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Finance Manager, Department Head"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={formSubmitting}
                />
              </div>

              {/* Description Field */}
              <div>
                <label htmlFor="editRoleDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="editRoleDescription"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description of this role's responsibilities"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={formSubmitting}
                />
              </div>

              {/* Error Message */}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{formError}</p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formSubmitting ? 'Updating...' : 'Update'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {roles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
          <TagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">No custom roles yet</p>
          <p className="text-gray-400 text-sm">
            Create roles to define your organization's approval structure
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <TagIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {role.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {role.description || (
                        <span className="italic text-gray-400">No description</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {role.isInUse ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        In Use
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Not Used
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(role.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleManageUsers(role)}
                        className="inline-flex items-center px-3 py-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Manage users"
                      >
                        <UsersIcon className="h-4 w-4 mr-1" />
                        Users
                      </button>
                      <button
                        onClick={() => handleStartEdit(role)}
                        className="inline-flex items-center px-3 py-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit role"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(role)}
                        className="inline-flex items-center px-3 py-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete role"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {roleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Role
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete the role "{roleToDelete.name}"?
              {roleToDelete.isInUse && (
                <span className="block mt-2 text-red-600 font-medium">
                  Warning: This role is currently in use in workflows and cannot be deleted.
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDelete}
                disabled={deletingRoleId === roleToDelete._id}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingRoleId === roleToDelete._id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingRoleId === roleToDelete._id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {managingUsersRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Manage Users - {managingUsersRole.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Assign or remove users from this role
                </p>
              </div>
              <button
                onClick={handleCloseUserManagement}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Close"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {userManagementError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-800 text-sm">{userManagementError}</p>
                </div>
              )}

              {loadingUsers ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Assigned Users Section */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">
                      Assigned Users ({assignedUsers.length})
                    </h4>
                    {assignedUsers.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <UsersIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No users assigned yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {assignedUsers.map((user) => (
                          <div
                            key={user._id}
                            className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center hover:border-gray-300 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {user.email}
                              </p>
                              <p className="text-xs text-gray-400">
                                ID: {user.empId}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveUser(user._id)}
                              disabled={removingUserId === user._id}
                              className="ml-3 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Remove user"
                            >
                              {removingUserId === user._id ? 'Removing...' : 'Remove'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Available Users Section */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">
                      Available Users ({availableUsers.length})
                    </h4>
                    
                    {/* Search Input */}
                    <div className="relative mb-3">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        placeholder="Search by name, email, or ID..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    {availableUsers.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <UsersIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">All users are assigned</p>
                      </div>
                    ) : filteredAvailableUsers.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <p className="text-gray-500 text-sm">No users match your search</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {filteredAvailableUsers.map((user) => (
                          <div
                            key={user._id}
                            className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center hover:border-gray-300 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {user.email}
                              </p>
                              <p className="text-xs text-gray-400">
                                ID: {user.empId}
                              </p>
                            </div>
                            <button
                              onClick={() => handleAssignUser(user._id)}
                              disabled={assigningUserId === user._id}
                              className="ml-3 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Assign user"
                            >
                              {assigningUserId === user._id ? 'Assigning...' : 'Assign'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseUserManagement}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
