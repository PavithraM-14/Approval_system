'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

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
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [signupFormStatus, setSignupFormStatus] = useState<Record<string, 'none' | 'configured' | 'loading'>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [viewingPermissionsRole, setViewingPermissionsRole] = useState<Role | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchRoles();
    fetchSignupFormStatus();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (response.ok) {
        const userData = await response.json();
        console.log('Current user data:', userData);
        setCurrentUser(userData.user); // Extract the user object from the response
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchSignupFormStatus = async () => {
    try {
      const response = await fetch('/api/signup-forms', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const statusMap: Record<string, 'configured'> = {};
        data.configurations?.forEach((config: any) => {
          statusMap[config.roleId] = 'configured';
        });
        console.log('Signup form status:', statusMap);
        setSignupFormStatus(statusMap);
      }
    } catch (error) {
      console.error('Error fetching signup form status:', error);
    }
  };

  const handleAutoGenerateSignupForm = async (roleId: string) => {
    setSignupFormStatus(prev => ({ ...prev, [roleId]: 'loading' }));
    
    try {
      const response = await fetch('/api/signup-forms/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roleId }),
      });

      if (response.ok) {
        const data = await response.json();
        setSignupFormStatus(prev => ({ ...prev, [roleId]: 'configured' }));
        alert(`Signup form generated successfully! ${data.analysis.hasWorkflowGroups ? 'Workflow-based group fields were automatically added.' : 'Standard fields were added.'}`);
      } else {
        const error = await response.json();
        if (response.status === 409) {
          setSignupFormStatus(prev => ({ ...prev, [roleId]: 'configured' }));
          alert('Signup form already exists for this role.');
        } else {
          throw new Error(error.error || 'Failed to generate signup form');
        }
      }
    } catch (error) {
      console.error('Error generating signup form:', error);
      setSignupFormStatus(prev => ({ ...prev, [roleId]: 'none' }));
      alert('Failed to generate signup form. Please try again.');
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
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
          <p className="text-gray-600 mt-1">
            Manage company roles with permissions and workflow assignments
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Roles define both what users can do (permissions) and who they are in workflows (for approval routing)
          </p>
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
                Signup Form
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roles.map((role) => (
              <tr 
                key={role._id} 
                onClick={() => router.push(`/dashboard/roles/${role._id}`)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-blue-600">{role.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600">{role.description}</div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingPermissionsRole(role);
                      setShowPermissionsModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors group"
                  >
                    <div className="p-1 rounded-full group-hover:bg-blue-50 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    </div>
                    View
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {signupFormStatus[role._id] === 'configured' ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Configured
                        </span>
                        {currentUser?.role?.isSystemAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Edit Fields clicked for role:', role._id);
                              console.log('Current user:', currentUser);
                              router.push(`/dashboard/admin/signup-forms?roleId=${role._id}`);
                            }}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors"
                            title="Edit signup form fields for this role"
                          >
                            <PencilIcon className="h-3 w-3 mr-1" />
                            Edit Fields
                          </button>
                        )}
                      </div>
                    ) : signupFormStatus[role._id] === 'loading' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAutoGenerateSignupForm(role._id);
                        }}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                        title="Auto-generate signup form based on workflow groups"
                      >
                        Generate Form
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingRole(role);
                      setShowModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                    title="Edit role"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(role._id);
                    }}
                    className={`${
                      role.isSystemAdmin 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-red-600 hover:text-red-900'
                    }`}
                    disabled={role.isSystemAdmin}
                    title={role.isSystemAdmin ? 'System admin roles cannot be deleted' : 'Delete role'}
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

      {showPermissionsModal && (
        <PermissionsModal
          role={viewingPermissionsRole}
          onClose={() => {
            setShowPermissionsModal(false);
            setViewingPermissionsRole(null);
          }}
        />
      )}
    </div>
  );
}

function PermissionsModal({ role, onClose }: { role: Role | null; onClose: () => void }) {
  if (!role) return null;

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
        return '';
    }
  };

  const enabledPermissions = Object.entries(role.permissions)
    .filter(([key, value]) => value && key !== 'canView');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
              Role Permissions
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Currently assigned permissions for <span className="font-semibold text-blue-600">{role.name}</span>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {enabledPermissions.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {enabledPermissions.map(([key, _]) => (
                <div key={key} className="flex gap-4 p-3 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all group">
                  <div className="mt-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-200 group-hover:scale-110 transition-transform"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-800">
                      {getPermissionLabel(key)}
                    </span>
                    <span className="text-xs text-gray-500 leading-relaxed mt-1">
                      {getPermissionDescription(key)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 italic">No special permissions assigned to this role.</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 focus:ring-4 focus:ring-blue-100 transition-all active:scale-95"
          >
            Got it
          </button>
        </div>
      </div>
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

      const autoEnableRaiseQueries = 
        formData.permissions.canApprove || 
        formData.permissions.canForward || 
        formData.permissions.canManageBudget;

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
                  const order = ['canCreate', 'canEdit', 'canShare', 'canDownload', 'canForward', 'canManageBudget', 'canESign', 'canApprove'];
                  return order.indexOf(a) - order.indexOf(b);
                })
                .map((key) => {
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