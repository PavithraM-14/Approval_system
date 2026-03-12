'use client';

import { useState, useEffect } from 'react';
import PasswordInput from './PasswordInput';

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
  fields: SignupField[];
  requireGroupSelection: boolean;
  allowedGroupTypes: string[];
  groupSelectionMode: 'single' | 'multiple';
}

interface Group {
  _id: string;
  name: string;
  type: string;
}

interface DynamicSignupFormProps {
  companyId: string;
  roleId: string;
  onSubmit: (formData: Record<string, any>) => Promise<void>;
  loading: boolean;
}

export default function DynamicSignupForm({
  companyId,
  roleId,
  onSubmit,
  loading,
}: DynamicSignupFormProps) {
  const [configuration, setConfiguration] = useState<SignupFormConfiguration | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    fetchConfiguration();
    fetchGroups();
  }, [companyId, roleId]);

  const fetchConfiguration = async () => {
    try {
      const response = await fetch(
        `/api/signup-forms/public?companyId=${companyId}&roleId=${roleId}`
      );
      if (response.ok) {
        const data = await response.json();
        setConfiguration(data.configuration);
      }
    } catch (err) {
      console.error('Failed to fetch configuration:', err);
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch(`/api/groups?companyId=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  };

  const validateField = (field: SignupField, value: any): string | null => {
    if (field.required && !value) {
      return `${field.label} is required`;
    }

    if (field.validation) {
      const { minLength, maxLength, pattern, customMessage } = field.validation;

      if (minLength && value.length < minLength) {
        return customMessage || `${field.label} must be at least ${minLength} characters`;
      }

      if (maxLength && value.length > maxLength) {
        return customMessage || `${field.label} must be at most ${maxLength} characters`;
      }

      if (pattern && !new RegExp(pattern).test(value)) {
        return customMessage || `${field.label} format is invalid`;
      }
    }

    return null;
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleGroupToggle = (groupId: string) => {
    if (!configuration) return;

    if (configuration.groupSelectionMode === 'single') {
      setSelectedGroups([groupId]);
    } else {
      setSelectedGroups(prev =>
        prev.includes(groupId)
          ? prev.filter(id => id !== groupId)
          : [...prev, groupId]
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!configuration) return;

    // Validate all fields
    const newErrors: Record<string, string> = {};
    
    configuration.fields.forEach(field => {
      const error = validateField(field, formData[field.fieldName]);
      if (error) {
        newErrors[field.fieldName] = error;
      }
    });

    // Validate group selection
    if (configuration.requireGroupSelection && selectedGroups.length === 0) {
      newErrors.groups = 'Please select at least one group';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Process group field values to find matching groups
    const processedGroupIds: string[] = [];
    
    // Handle traditional group selection (if any)
    processedGroupIds.push(...selectedGroups);
    
    // Handle workflow-based group fields (like region, department, etc.)
    for (const field of configuration.fields) {
      const fieldValue = formData[field.fieldName];
      if (fieldValue && field.type === 'select' && 
          ['region', 'department', 'costcenter', 'custom'].some(type => 
            field.fieldName.toLowerCase().includes(type.replace('_', ''))
          )) {
        
        // Find the group that matches this field value
        const matchingGroup = groups.find(g => 
          g.name === fieldValue && 
          configuration.allowedGroupTypes.includes(g.type)
        );
        
        if (matchingGroup && !processedGroupIds.includes(matchingGroup._id)) {
          processedGroupIds.push(matchingGroup._id);
        }
      }
    }

    // Submit form data with processed group IDs
    await onSubmit({
      ...formData,
      groupIds: processedGroupIds,
    });
  };

  const renderField = (field: SignupField) => {
    const value = formData[field.fieldName] || '';
    const error = errors[field.fieldName];

    // Special handling for password fields
    if (field.fieldName === 'password' || field.fieldName === 'confirmPassword') {
      return (
        <div key={field.fieldName}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {field.label} {field.required && '*'}
          </label>
          <PasswordInput
            value={value}
            onChange={(val) => handleFieldChange(field.fieldName, val)}
            required={field.required}
            placeholder={field.placeholder}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {field.helpText && (
            <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
          )}
          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
        </div>
      );
    }

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.fieldName}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && '*'}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
              required={field.required}
              placeholder={field.placeholder}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {field.helpText && (
              <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
            )}
            {error && (
              <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.fieldName}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && '*'}
            </label>
            <select
              value={value}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
              required={field.required}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select {field.label}</option>
              {field.options?.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {field.helpText && (
              <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
            )}
            {error && (
              <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
          </div>
        );

      case 'multiselect':
        return (
          <div key={field.fieldName}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && '*'}
            </label>
            <div className="space-y-2">
              {field.options?.map(option => (
                <div key={option} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`${field.fieldName}-${option}`}
                    checked={(value as string[])?.includes(option) || false}
                    onChange={(e) => {
                      const currentValues = (value as string[]) || [];
                      const newValues = e.target.checked
                        ? [...currentValues, option]
                        : currentValues.filter(v => v !== option);
                      handleFieldChange(field.fieldName, newValues);
                    }}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`${field.fieldName}-${option}`} className="ml-2 text-sm text-gray-700">
                    {option}
                  </label>
                </div>
              ))}
            </div>
            {field.helpText && (
              <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
            )}
            {error && (
              <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
          </div>
        );

      default:
        return (
          <div key={field.fieldName}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && '*'}
            </label>
            <input
              type={field.type}
              value={value}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
              required={field.required}
              placeholder={field.placeholder}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {field.helpText && (
              <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
            )}
            {error && (
              <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
          </div>
        );
    }
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!configuration) {
    return (
      <div className="text-center py-12 text-red-600">
        Failed to load form configuration
      </div>
    );
  }

  const sortedFields = [...configuration.fields].sort((a, b) => a.order - b.order);
  const filteredGroups = configuration.requireGroupSelection
    ? groups.filter(g => configuration.allowedGroupTypes.includes(g.type))
    : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Render custom fields */}
      {sortedFields.map(field => renderField(field))}

      {/* Group Selection */}
      {configuration.requireGroupSelection && filteredGroups.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Group(s) *
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-4">
            {filteredGroups.map(group => (
              <div key={group._id} className="flex items-center">
                <input
                  type={configuration.groupSelectionMode === 'single' ? 'radio' : 'checkbox'}
                  id={`group-${group._id}`}
                  name="group-selection"
                  checked={selectedGroups.includes(group._id)}
                  onChange={() => handleGroupToggle(group._id)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor={`group-${group._id}`} className="ml-2 text-sm text-gray-700">
                  {group.name} <span className="text-gray-500">({group.type})</span>
                </label>
              </div>
            ))}
          </div>
          {errors.groups && (
            <p className="text-xs text-red-600 mt-1">{errors.groups}</p>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          'Continue to Verification'
        )}
      </button>
    </form>
  );
}
