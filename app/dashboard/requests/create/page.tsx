'use client';

import { useState } from 'react';
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

  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    college: '',
    department: '',
    costEstimate: '',
    expenseCategory: '',
    requestType: 'one-time' as 'one-time' | 'renewal',
  });

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
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Create New Request</h2>
        <p className="text-gray-600 mt-1">Fill in the details for your new request</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter request title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Purpose <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Describe the purpose of this request"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Institution
            </label>
            <InstitutionSelect
              value={formData.college}
              onChange={(value) => setFormData({ ...formData, college: value })}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter department"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cost Estimate
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expense Category
            </label>
            <input
              type="text"
              value={formData.expenseCategory}
              onChange={(e) => setFormData({ ...formData, expenseCategory: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter expense category"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Request Type <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.requestType}
            onChange={(e) => setFormData({ ...formData, requestType: e.target.value as 'one-time' | 'renewal' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="one-time">One-time</option>
            <option value="renewal">Renewal</option>
          </select>
        </div>

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
