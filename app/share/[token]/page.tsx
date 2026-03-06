'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DocumentIcon, ClockIcon, UserIcon, LockClosedIcon, EyeIcon } from '@heroicons/react/24/outline';

interface ShareInfo {
  token: string;
  fileName: string;
  fileType: string;
  createdBy: string;
  expiresAt: string;
  isExpired: boolean;
  isActive: boolean;
  accessCount: number;
  maxAccessCount: number | null;
  watermarkEnabled: boolean;
  requiresPassword: boolean;
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  useEffect(() => {
    fetchShareInfo();
  }, [token]);

  const fetchShareInfo = async () => {
    try {
      const response = await fetch(`/api/share/${token}/info`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load share link');
        return;
      }

      setShareInfo(data);
      setShowPasswordInput(data.requiresPassword);
    } catch (err) {
      setError('Failed to load share link');
    } finally {
      setLoading(false);
    }
  };

  const handleView = () => {
    const url = `/api/share/${token}?action=view${password ? `&password=${encodeURIComponent(password)}` : ''}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !shareInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <ClockIcon className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Not Available</h1>
          <p className="text-gray-600">{error || 'This share link is not available'}</p>
        </div>
      </div>
    );
  }

  if (shareInfo.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
          <p className="text-gray-600 mb-4">This link has expired.</p>
          <p className="text-sm text-gray-500">
            Expired on: {new Date(shareInfo.expiresAt).toLocaleString()}
          </p>
        </div>
      </div>
    );
  }

  if (!shareInfo.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <LockClosedIcon className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Inactive</h1>
          <p className="text-gray-600">This share link is no longer active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <h1 className="text-2xl font-bold text-white">Shared Document</h1>
          <p className="text-blue-100 text-sm mt-1">S.E.A.D. - Secure Document Sharing</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* File Info */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                <DocumentIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 mb-1 break-words">
                {shareInfo.fileName}
              </h2>
              <p className="text-sm text-gray-500">
                {shareInfo.fileType} Document
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-3 mb-6 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 text-sm">
              <UserIcon className="h-5 w-5 text-gray-400" />
              <span className="text-gray-600">Shared by:</span>
              <span className="font-medium text-gray-900">{shareInfo.createdBy}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <ClockIcon className="h-5 w-5 text-gray-400" />
              <span className="text-gray-600">Expires:</span>
              <span className="font-medium text-gray-900">
                {new Date(shareInfo.expiresAt).toLocaleString()}
              </span>
            </div>
            {shareInfo.maxAccessCount && (
              <div className="flex items-center gap-3 text-sm">
                <EyeIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600">Access count:</span>
                <span className="font-medium text-gray-900">
                  {shareInfo.accessCount} / {shareInfo.maxAccessCount}
                </span>
              </div>
            )}
          </div>

          {/* Watermark Notice - Removed as per user request */}

          {/* Password Input */}
          {showPasswordInput && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password Required
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to access"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleView}
              disabled={showPasswordInput && !password}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <EyeIcon className="h-5 w-5" />
              View Document
            </button>
          </div>

          {/* Info about viewing */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> The document will open in your browser. Office documents (Word, Excel, PowerPoint) will be converted to PDF for viewing.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            This is a secure shared link. Do not share this URL with unauthorized persons.
          </p>
        </div>
      </div>
    </div>
  );
}
