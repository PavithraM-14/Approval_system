'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Role {
  _id: string;
  name: string;
  description: string;
  isSystemAdmin: boolean;
  permissions: {
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

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        // API returns roles directly as an array, not wrapped in an object
        setRoles(Array.isArray(data) ? data : (data.roles || []));
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        fetchRoles();
      } else {
        alert('Failed to delete role');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Error deleting role');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Role Management</h2>
          <p className="text-gray-600 mt-1">Manage user roles and permissions</p>
        </div>
        <button
          onClick={() => {
            setEditingRole(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Create Role
        </button>
      </div>

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
                Permissions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roles.map((role) => (
              <tr key={role._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{role.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600">{role.description}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(role.permissions).map(([key, value]) => {
                      if (!value) return null;
                      
                      // Custom label mapping
                      const getPermissionLabel = (permKey: string) => {
                        if (permKey === 'canCreate') return 'Create & Respond';
                        if (permKey === 'canApprove') return 'Final Approval';
                        if (permKey === 'canForward') return 'Forward Approval';
                        if (permKey === 'canShare') return 'External Sharing';
                        if (permKey === 'canDownload') return 'Download';
                        if (permKey === 'canESign') return 'E-Signature';
                        if (permKey === 'canRaiseQueries') return 'Raise Queries';
                        return permKey.replace('can', '').replace(/([A-Z])/g, ' $1').trim();
                      };

                      return (
                        <span
                          key={key}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                        >
                          {getPermissionLabel(key)}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {role.isSystemAdmin ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      System Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Standard
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setEditingRole(role);
                      setShowModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(role._id)}
                    className="text-red-600 hover:text-red-900"
                    disabled={role.isSystemAdmin}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {roles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No roles found. Create your first role to get started.</p>
          </div>
        )}
      </div>

      {showModal && (
        <RoleModal
          role={editingRole}
          onClose={() => {
            setShowModal(false);
            setEditingRole(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingRole(null);
            fetchRoles();
          }}
        />
      )}
    </div>
  );
}

function RoleModal({ role, onClose, onSave }: { role: Role | null; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    isSystemAdmin: role?.isSystemAdmin || false,
    permissions: role?.permissions || {
      canView: true,
      canCreate: false,
      canEdit: false,
      canShare: false,
      canDownload: false,
      canForward: false,
      canManageBudget: false,
      canESign: false,
      canApprove: false,
      canRaiseQueries: false,
    }
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = role ? `/api/roles/${role._id}` : '/api/roles';
      const method = role ? 'PUT' : 'POST';

      // Automatically enable canRaiseQueries if user has Final Approval, Forward Approval, or Manage Budget
      const autoEnableRaiseQueries = 
        formData.permissions.canApprove || 
        formData.permissions.canForward || 
        formData.permissions.canManageBudget;

      // Ensure canView is always true and canRaiseQueries is auto-enabled based on other permissions
      const dataToSend = {
        ...formData,
        permissions: {
          ...formData.permissions,
          canView: true,
          canRaiseQueries: autoEnableRaiseQueries
        }
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        onSave();
      } else {
        alert('Failed to save role');
      }
    } catch (error) {
      console.error('Error saving role:', error);
      alert('Error saving role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900">
            {role ? 'Edit Role' : 'Create New Role'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isSystemAdmin}
                onChange={(e) => setFormData({ ...formData, isSystemAdmin: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">System Administrator</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              System admins have full access to all features
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Permissions
            </label>
            <div className="space-y-2">
              {Object.keys(formData.permissions)
                .filter(key => key !== 'canView' && key !== 'canRaiseQueries')
                .sort((a, b) => {
                  // Define custom order: canESign before canApprove (last)
                  const order = ['canCreate', 'canEdit', 'canShare', 'canDownload', 'canForward', 'canManageBudget', 'canESign', 'canApprove'];
                  return order.indexOf(a) - order.indexOf(b);
                })
                .map((key) => {
                // Custom label mapping
                const getPermissionLabel = (permKey: string) => {
                  if (permKey === 'canCreate') return 'Create & Respond';
                  if (permKey === 'canApprove') return 'Final Approval';
                  if (permKey === 'canForward') return 'Forward Approval';
                  if (permKey === 'canShare') return 'External Sharing';
                  if (permKey === 'canDownload') return 'Download';
                  if (permKey === 'canESign') return 'E-Signature';
                  if (permKey === 'canRaiseQueries') return 'Raise Queries';
                  return permKey.replace('can', '').replace(/([A-Z])/g, ' $1').trim();
                };

                const getPermissionDescription = (permKey: string) => {
                  switch (permKey) {
                    case 'canCreate':
                      return 'Allows creating new requests and responding to queries raised on them';
                    case 'canEdit':
                      return 'Allows editing documents, attachments, and uploading new versions';
                    case 'canShare':
                      return 'Allows creating external links, sending via Gmail, and linking to ERP/CRM/HR';
                    case 'canDownload':
                      return 'Allows downloading documents and attachments';
                    case 'canForward':
                      return 'Receives requests from creators and forwards to final approvers';
                    case 'canManageBudget':
                      return 'Allows managing budget allocations and financial records';
                    case 'canESign':
                      return 'Allows providing e-signature for approvals and authorizations';
                    case 'canApprove':
                      return 'Final approver who completes the approval flow';
                    case 'canRaiseQueries':
                      return 'Allows raising queries to request creators';
                    default:
                      return null;
                  }
                };

                const description = getPermissionDescription(key);

                return (
                  <label key={key} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={formData.permissions[key as keyof typeof formData.permissions]}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          permissions: {
                            ...formData.permissions,
                            [key]: e.target.checked
                          }
                        });
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700">
                        {getPermissionLabel(key)}
                      </span>
                      {description && (
                        <span className="text-xs text-gray-500">
                          {description}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="font-medium text-blue-700">Note:</span> Roles with Final Approval, Forward Approval, or Manage Budget permissions automatically gain the ability to raise queries to request creators.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
