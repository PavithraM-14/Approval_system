'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface RequestFormField {
  fieldName: string;
  label: string;
  required: boolean;
  enabled: boolean;
  order: number;
}

interface RequestFormConfiguration {
  _id: string;
  companyId: string;
  fields: RequestFormField[];
}

export default function RequestFormAdminPage() {
  const router = useRouter();
  const [config, setConfig] = useState<RequestFormConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const meData = await meRes.json();
        if (!meData.user?.role?.isSystemAdmin) {
          router.push('/dashboard');
          return;
        }
        setIsAdmin(true);

        const res = await fetch('/api/request-form', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setConfig(data.configuration);
        } else {
          setError('Failed to load request form configuration');
        }
      } catch (err) {
        console.error('Failed to load request form configuration:', err);
        setError('Failed to load request form configuration');
      } finally {
        setAuthChecked(true);
        setLoading(false);
      }
    };

    checkAuthAndLoad();
  }, [router]);

  const updateField = (index: number, updates: Partial<RequestFormField>) => {
    if (!config) return;
    const newFields = [...config.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setConfig({ ...config, fields: newFields });
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (!config) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= config.fields.length) return;
    const newFields = [...config.fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    newFields.forEach((field, i) => {
      field.order = i + 1;
    });
    setConfig({ ...config, fields: newFields });
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/request-form', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fields: config.fields }),
      });

      if (res.ok) {
        setSuccess('Request form configuration saved successfully');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save request form configuration');
      }
    } catch (err) {
      console.error('Failed to save request form configuration:', err);
      setError('Failed to save request form configuration');
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked || !isAdmin || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Request Form Configuration</h1>
        <p className="text-red-600 text-sm">Failed to load configuration.</p>
      </div>
    );
  }

  const sortedFields = [...config.fields].sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Request Form Configuration</h1>
          <p className="text-gray-600 mt-1">
            Control which fields appear on the Create Request form and how they behave.
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/requests/create')}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Back to Create Request
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

      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        {sortedFields.map((field, index) => (
          <div key={field.fieldName} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">
                  {field.fieldName}
                </span>
                <label className="flex items-center gap-1 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={(e) => updateField(index, { enabled: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  Visible
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  Required
                </label>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveField(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Move up"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveField(index, 'down')}
                  disabled={index === sortedFields.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Move down"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}

