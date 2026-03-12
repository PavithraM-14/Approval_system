'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Role {
  _id: string;
  name: string;
}

interface SignupField {
  fieldName: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'multiselect' | 'textarea';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    customMessage?: string;
  };
  order: number;
}

interface SignupFormConfiguration {
  _id: string;
  roleId: string;
  roleName: string;
  fields: SignupField[];
  requireGroupSelection: boolean;
  allowedGroupTypes: string[];
  groupSelectionMode: 'single' | 'multiple';
  isActive: boolean;
}

interface Group {
  _id: string;
  name: string;
  type: string;
}

export default function SignupFormsAdminPage() {
  const router = useRouter();
  const [configurations, setConfigurations] = useState<SignupFormConfiguration[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedConfig, setSelectedConfig] = useState<SignupFormConfiguration | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Check for roleId in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const roleIdParam = urlParams.get('roleId');
    if (roleIdParam) {
      setSelectedRoleId(roleIdParam);
    }
    
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configsRes, rolesRes, groupsRes] = await Promise.all([
        fetch('/api/signup-forms'),
        fetch('/api/roles'),
        fetch('/api/groups'),
      ]);

      if (configsRes.ok) {
        const data = await configsRes.json();
        setConfigurations(data.configurations || []);
      }

      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setRoles(data.roles || []);
      }

      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    // Pre-select role if provided in URL
    const urlParams = new URLSearchParams(window.location.search);
    const roleIdParam = urlParams.get('roleId');
    const preSelectedRole = roleIdParam ? roles.find(r => r._id === roleIdParam) : null;
    
    setSelectedConfig({
      _id: '',
      roleId: roleIdParam || '',
      roleName: preSelectedRole?.name || '',
      fields: [],
      requireGroupSelection: false,
      allowedGroupTypes: [],
      groupSelectionMode: 'single',
      isActive: true,
    });
    setIsEditing(true);
  };

  const handleEdit = (config: SignupFormConfiguration) => {
    setSelectedConfig(config);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedConfig) return;

    try {
      setError('');
      setSuccess('');

      const method = selectedConfig._id ? 'PUT' : 'POST';
      const url = selectedConfig._id 
        ? `/api/signup-forms/${selectedConfig._id}`
        : '/api/signup-forms';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedConfig),
      });

      if (response.ok) {
        setSuccess('Configuration saved successfully');
        setIsEditing(false);
        setSelectedConfig(null);
        fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save configuration');
      }
    } catch (err) {
      setError('An error occurred while saving');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      const response = await fetch(`/api/signup-forms/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Configuration deleted successfully');
        fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete configuration');
      }
    } catch (err) {
      setError('An error occurred while deleting');
    }
  };

  const addField = () => {
    if (!selectedConfig) return;

    const newField: SignupField = {
      fieldName: '',
      label: '',
      type: 'text',
      required: false,
      order: selectedConfig.fields.length + 1,
    };

    setSelectedConfig({
      ...selectedConfig,
      fields: [...selectedConfig.fields, newField],
    });
  };

  const updateField = (index: number, updates: Partial<SignupField>) => {
    if (!selectedConfig) return;

    const updatedFields = [...selectedConfig.fields];
    updatedFields[index] = { ...updatedFields[index], ...updates };

    setSelectedConfig({
      ...selectedConfig,
      fields: updatedFields,
    });
  };

  const removeField = (index: number) => {
    if (!selectedConfig) return;

    const updatedFields = selectedConfig.fields.filter((_, i) => i !== index);
    setSelectedConfig({
      ...selectedConfig,
      fields: updatedFields,
    });
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (!selectedConfig) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedConfig.fields.length) return;

    const updatedFields = [...selectedConfig.fields];
    [updatedFields[index], updatedFields[newIndex]] = [updatedFields[newIndex], updatedFields[index]];
    
    // Update order numbers
    updatedFields.forEach((field, i) => {
      field.order = i + 1;
    });

    setSelectedConfig({
      ...selectedConfig,
      fields: updatedFields,
    });
  };

  const groupTypes = ['region', 'department', 'cost_center', 'custom'];

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

  if (isEditing && selectedConfig) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => {
              setIsEditing(false);
              setSelectedConfig(null);
            }}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to list
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6">
            {selectedConfig._id ? 'Edit' : 'Create'} Signup Form Configuration
          </h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                value={selectedConfig.roleId}
                onChange={(e) => {
                  const role = roles.find(r => r._id === e.target.value);
                  setSelectedConfig({
                    ...selectedConfig,
                    roleId: e.target.value,
                    roleName: role?.name || '',
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                disabled={!!selectedConfig._id}
              >
                <option value="">Select a role</option>
                {roles.map(role => (
                  <option key={role._id} value={role._id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Group Selection Settings */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Group Selection Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requireGroupSelection"
                    checked={selectedConfig.requireGroupSelection}
                    onChange={(e) => setSelectedConfig({
                      ...selectedConfig,
                      requireGroupSelection: e.target.checked,
                    })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="requireGroupSelection" className="ml-2 text-sm text-gray-700">
                    Require group selection during signup
                  </label>
                </div>

                {selectedConfig.requireGroupSelection && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Allowed Group Types
                      </label>
                      <div className="space-y-2">
                        {groupTypes.map(type => (
                          <div key={type} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`groupType-${type}`}
                              checked={selectedConfig.allowedGroupTypes.includes(type)}
                              onChange={(e) => {
                                const types = e.target.checked
                                  ? [...selectedConfig.allowedGroupTypes, type]
                                  : selectedConfig.allowedGroupTypes.filter(t => t !== type);
                                setSelectedConfig({
                                  ...selectedConfig,
                                  allowedGroupTypes: types,
                                });
                              }}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`groupType-${type}`} className="ml-2 text-sm text-gray-700 capitalize">
                              {type.replace('_', ' ')}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selection Mode
                      </label>
                      <select
                        value={selectedConfig.groupSelectionMode}
                        onChange={(e) => setSelectedConfig({
                          ...selectedConfig,
                          groupSelectionMode: e.target.value as 'single' | 'multiple',
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="single">Single group selection</option>
                        <option value="multiple">Multiple group selection</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Custom Fields */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Custom Fields</h3>
                <button
                  onClick={addField}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Field
                </button>
              </div>

              <div className="space-y-4">
                {selectedConfig.fields.map((field, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-700">Field {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveField(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveField(index, 'down')}
                          disabled={index === selectedConfig.fields.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeField(index)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Field Name</label>
                        <input
                          type="text"
                          value={field.fieldName}
                          onChange={(e) => updateField(index, { fieldName: e.target.value })}
                          placeholder="e.g., department"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          placeholder="e.g., Department"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                        <select
                          value={field.type}
                          onChange={(e) => updateField(index, { type: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="tel">Phone</option>
                          <option value="select">Select</option>
                          <option value="multiselect">Multi-select</option>
                          <option value="textarea">Textarea</option>
                        </select>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`required-${index}`}
                          checked={field.required}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`required-${index}`} className="ml-2 text-sm text-gray-700">
                          Required
                        </label>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Placeholder</label>
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={(e) => updateField(index, { placeholder: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {selectedConfig.fields.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No custom fields added. Click "Add Field" to create one.
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedConfig(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Save Configuration
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
          <h1 className="text-3xl font-bold text-gray-900">
            {selectedRoleId ? 'Edit Signup Form' : 'Signup Form Configurations'}
          </h1>
          <p className="text-gray-600 mt-1">
            {selectedRoleId 
              ? `Customize signup form for ${roles.find(r => r._id === selectedRoleId)?.name || 'selected role'}`
              : 'Customize signup forms for each role'
            }
          </p>
          {selectedRoleId && (
            <button
              onClick={() => {
                router.push('/dashboard/admin/signup-forms');
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800 mt-2 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to all configurations
            </button>
          )}
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {selectedRoleId ? 'Create/Edit Form' : 'Create New'}
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

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Custom Fields
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Group Selection
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
            {configurations
              .filter(config => !selectedRoleId || config.roleId === selectedRoleId)
              .map((config) => (
              <tr key={config._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{config.roleName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{config.fields.length} fields</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {config.requireGroupSelection ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Required ({config.groupSelectionMode})
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      Optional
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {config.isActive ? (
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
                    onClick={() => handleEdit(config)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(config._id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {configurations.filter(config => !selectedRoleId || config.roleId === selectedRoleId).length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {selectedRoleId ? 'No configuration for this role' : 'No configurations'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedRoleId 
                ? `Create a signup form configuration for ${roles.find(r => r._id === selectedRoleId)?.name || 'this role'}.`
                : 'Get started by creating a new signup form configuration.'
              }
            </p>
            <div className="mt-6">
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {selectedRoleId ? 'Create Form for This Role' : 'Create Configuration'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
