'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import InstitutionSelect from '@/components/InstitutionSelect';
import FileUpload from '@/components/FileUpload';
import GmailImportModal from '@/components/GmailImportModal';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

export default function CreateRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [showGmailImport, setShowGmailImport] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userChecked, setUserChecked] = useState(false);
  const [requestConfig, setRequestConfig] = useState<{
    fields: {
      fieldName: string;
      label: string;
      required: boolean;
      enabled: boolean;
      order: number;
    }[];
  } | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    college: '',
    department: '',
    costEstimate: '',
    expenseCategory: '',
    requestType: 'one-time' as 'one-time' | 'renewal',
  });

  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          setUserChecked(true);
          return;
        }
        const data = await res.json();
        if (data.user?.role?.isSystemAdmin) {
          setIsAdmin(true);
        }

        // Load request form configuration for this company
        const cfgRes = await fetch('/api/request-form', { credentials: 'include' });
        if (cfgRes.ok) {
          const cfgData = await cfgRes.json();
          setRequestConfig({ fields: cfgData.configuration.fields || [] });
        }
      } catch {
        // ignore – page still works for non-admins
      } finally {
        setUserChecked(true);
        setConfigLoading(false);
      }
    };

    checkUser();
  }, []);

  const getFieldConfig = useMemo(() => {
    const map: Record<string, any> = {};
    (requestConfig?.fields || []).forEach((f) => {
      map[f.fieldName] = f;
    });
    return map;
  }, [requestConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (attachments.length === 0) {
      setError('Please attach at least one file to your request');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          costEstimate: formData.costEstimate ? parseFloat(formData.costEstimate) : 0,
          attachments,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create request');
      }

      const data = await response.json();
      router.push(`/dashboard/requests/${data._id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const handleGmailImportComplete = (importedDocs?: any[]) => {
    if (importedDocs && importedDocs.length > 0) {
      const filePaths = importedDocs.map(doc => doc.filePath).filter(Boolean);
      setAttachments(prev => [...prev, ...filePaths]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      <div className="mb-6 space-y-3">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Create New Request</h2>
          <p className="text-gray-600 mt-1">Fill in the details for your new request</p>
        </div>

        {userChecked && isAdmin && (
          <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Request form editing enabled</p>
              <p className="text-xs text-blue-800">
                You are a system admin. Use the request form configuration screen to add, remove, or reorder fields such
                as cost estimate and other request details.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/admin/request-form')}
              className="whitespace-nowrap rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Edit Request Fields
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-6">
        {/* Title */}
        {getFieldConfig.title?.enabled !== false && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getFieldConfig.title?.label || 'Title'}{' '}
              {getFieldConfig.title?.required !== false && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              required={getFieldConfig.title?.required !== false}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter request title"
            />
          </div>
        )}

        {/* Purpose */}
        {getFieldConfig.purpose?.enabled !== false && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getFieldConfig.purpose?.label || 'Purpose'}{' '}
              {getFieldConfig.purpose?.required !== false && <span className="text-red-500">*</span>}
            </label>
            <textarea
              required={getFieldConfig.purpose?.required !== false}
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Describe the purpose of this request"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Institution */}
          {getFieldConfig.college?.enabled !== false && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {getFieldConfig.college?.label || 'Institution'}
              </label>
              <InstitutionSelect
                value={formData.college}
                onChange={(value) => setFormData({ ...formData, college: value })}
                className="w-full"
              />
            </div>
          )}

          {/* Department */}
          {getFieldConfig.department?.enabled !== false && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {getFieldConfig.department?.label || 'Department'}
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter department"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cost Estimate */}
          {getFieldConfig.costEstimate?.enabled !== false && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {getFieldConfig.costEstimate?.label || 'Cost Estimate'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.costEstimate}
                onChange={(e) => setFormData({ ...formData, costEstimate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
          )}

          {/* Expense Category */}
          {getFieldConfig.expenseCategory?.enabled !== false && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {getFieldConfig.expenseCategory?.label || 'Expense Category'}
              </label>
              <input
                type="text"
                value={formData.expenseCategory}
                onChange={(e) => setFormData({ ...formData, expenseCategory: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter expense category"
              />
            </div>
          )}
        </div>

        {/* Request Type */}
        {getFieldConfig.requestType?.enabled !== false && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getFieldConfig.requestType?.label || 'Request Type'}{' '}
              {getFieldConfig.requestType?.required !== false && <span className="text-red-500">*</span>}
            </label>
            <select
              required={getFieldConfig.requestType?.required !== false}
              value={formData.requestType}
              onChange={(e) =>
                setFormData({ ...formData, requestType: e.target.value as 'one-time' | 'renewal' })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="one-time">One-time</option>
              <option value="renewal">Renewal</option>
            </select>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Attachments <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowGmailImport(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <EnvelopeIcon className="h-4 w-4" />
              Import from Gmail
            </button>
          </div>
          <FileUpload
            onFilesUploaded={setAttachments}
            maxFiles={10}
            existingFiles={attachments}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Request'}
          </button>
        </div>
      </form>

      <GmailImportModal
        isOpen={showGmailImport}
        onClose={() => setShowGmailImport(false)}
        onImportComplete={handleGmailImportComplete}
      />
    </div>
  );
}
