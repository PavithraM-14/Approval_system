'use client';

import { useState, useRef, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, PencilIcon } from '@heroicons/react/24/outline';
import { User } from '../lib/types';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    _id: string;
    title: string;
    purpose: string;
    costEstimate: number;
    requester: { name: string };
    status?: string;
    budgetAllocated?: number;
    budgetSpent?: number;
    budgetBalance?: number;
    budgetAvailable?: boolean;
  };
  user: User | null;
  initialAction?: 'approve' | 'reject' | 'reject_with_clarification';
  onApprove: (notes: string, attachments: string[], signature?: string) => void;
  onReject: (notes: string) => void;
  onRejectWithClarification: (queryRequest: string, attachments: string[]) => void;
  loading?: boolean;
}

export default function ApprovalModal({
  isOpen,
  onClose,
  request,
  user,
  initialAction,
  onApprove,
  onReject,
  onRejectWithClarification,
  loading = false
}: ApprovalModalProps) {
  const permissions = user?.role?.permissions || {
    canView: true,
    canEdit: false,
    canShare: false,
    canDownload: false,
    canForward: false,
    canManageBudget: false,
    canESign: false,
    canApprove: false,
    canRaiseQueries: false,
  };

  const [action, setAction] = useState<'approve' | 'reject' | 'reject_with_clarification'>(() => {
    return initialAction || 'approve';
  });
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState('');

  useEffect(() => {
    if (initialAction) {
      setAction(initialAction);
    }
  }, [initialAction]);

  const [attachments, setAttachments] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSubmit = () => {
    // E-signature validation for approve action
    if (action === 'approve' && permissions.canESign) {
      if (!signature.trim()) {
        alert('Please enter your full name as e-signature');
        return;
      }
      if (signature.trim().toLowerCase() !== user?.name.toLowerCase()) {
        alert(`Signature must exactly match your name: ${user?.name}`);
        return;
      }
    }

    // Handle different actions
    switch (action) {
      case 'approve':
        onApprove(notes, attachments, signature);
        break;
      case 'reject':
        if (!notes.trim()) {
          alert('Please provide a reason for rejection');
          return;
        }
        onReject(notes);
        break;
      case 'reject_with_clarification':
        if (!notes.trim()) {
          alert('Please provide query for the requester');
          return;
        }
        onRejectWithClarification(notes, attachments);
        break;
    }
  };

  const resetForm = () => {
    setAction('approve');
    setNotes('');
    setSignature('');
    setAttachments([]);
    setUrlInput('');
    setShowUrlInput(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      setAttachments(prev => [...prev, urlInput.trim()]);
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const handleShowUrlInput = () => {
    setShowUrlInput(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const validFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (validFiles.length !== files.length) {
      alert('Only PDF documents are allowed.');
      return;
    }

    try {
      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('files', file);
      });

      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploaded = await res.json();
      setAttachments(prev => [...prev, ...uploaded.files]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'File upload failed.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-1">
              Process Request
            </h3>
            <p className="text-sm text-gray-500">
              Current status: <span className="font-mono">{request.status || 'pending'}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Request Details Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">{request.title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Requester</span>
                <p className="text-sm text-gray-900">{request.requester.name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Cost Estimate</span>
                <p className="text-sm text-gray-900">
                  {request.costEstimate > 0 ? `₹${request.costEstimate.toLocaleString()}` : 'No cost specified'}
                </p>
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Purpose</span>
              <p className="text-sm text-gray-900">{request.purpose}</p>
            </div>
          </div>

          {/* Budget Information Display (if available) */}
          {request.budgetAllocated && request.budgetAllocated > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-lg font-medium text-blue-900 mb-4">Budget Information</h4>
              <p className="text-sm text-blue-700 mb-3">Budget details from previous verification:</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <span className="text-xs font-medium text-gray-600">Budget Allocated</span>
                  <p className="text-lg font-semibold text-blue-600">₹{request.budgetAllocated.toLocaleString()}</p>
                </div>

                {request.budgetSpent !== undefined && (
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <span className="text-xs font-medium text-gray-600">Budget Spent</span>
                    <p className="text-lg font-semibold text-orange-600">₹{request.budgetSpent.toLocaleString()}</p>
                  </div>
                )}

                {request.budgetBalance !== undefined && (
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <span className="text-xs font-medium text-gray-600">Budget Available</span>
                    <p className={`text-lg font-semibold ${request.budgetBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{request.budgetBalance.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {request.budgetAvailable !== undefined && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Budget Status:</span>
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      request.budgetAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {request.budgetAvailable ? 'Budget Approved' : 'Budget Not Available'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Document Attachments Section */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Document Attachments</h4>

            {/* Upload Buttons */}
            <div className="flex gap-3 mb-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="application/pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                Upload File
              </button>
              <button
                onClick={handleShowUrlInput}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                disabled={loading}
              >
                Add URL
              </button>
            </div>

            {/* URL Input */}
            {showUrlInput && (
              <div className="mb-4 flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Enter URL..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                  autoFocus
                />
                <button
                  onClick={handleAddUrl}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  disabled={loading || !urlInput.trim()}
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowUrlInput(false);
                    setUrlInput('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* File Type Info */}
            <div className="text-xs text-gray-500 mb-4">
              <p className="font-medium mb-1">Supported file types:</p>
              <p>Documents: PDF only</p>
              <p>Maximum file size: 10MB per file</p>
            </div>

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {attachment.startsWith('/uploads/') ? attachment.split('/').pop() : attachment}
                    </span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-800 text-sm ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Section */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">Action</h4>

            <select
              value={action}
              onChange={(e) => setAction(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              disabled={loading}
            >
              <option value="approve">Approve & Forward</option>
              <option value="reject">Reject</option>
              <option value="reject_with_clarification">Raise Query</option>
            </select>

            {/* Action Options Display */}
            <div className="mt-3 space-y-2">
              {action === 'approve' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-700">Approve & Forward</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">Approve and forward to next step in workflow</p>
                </div>
              )}

              {action === 'reject' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                    <span className="font-medium text-red-700">Reject</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">Permanently reject this request</p>
                </div>
              )}

              {action === 'reject_with_clarification' && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 mr-2" />
                    <span className="font-medium text-orange-700">Raise Query</span>
                  </div>
                  <p className="text-sm text-orange-600 mt-1">
                    Request additional information from the requester
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">
              {action === 'approve' ? 'Comments (Optional)' : 'Notes'}
            </h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                action === 'approve'
                  ? "Add any comments or notes for this approval..."
                  : action === 'reject_with_clarification'
                    ? "What query do you have for the requester?"
                    : "Please provide a reason for rejection..."
              }
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={loading}
            />
            {action === 'approve' && (
              <p className="text-xs text-gray-500 mt-1">
                Comments are optional. You can leave this blank if no additional notes are needed.
              </p>
            )}
          </div>

          {/* E-Signature Section */}
          {action === 'approve' && permissions.canESign && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <div className="flex items-center gap-2 mb-3">
                <PencilIcon className="w-5 h-5 text-blue-600" />
                <h4 className="text-lg font-medium text-gray-900">E-Signature Required</h4>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Please type your full name <strong className="text-blue-600 underline decoration-dotted">{user?.name}</strong> exactly as shown to authorize this approval with your e-signature.
              </p>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder={`Type "${user?.name}" to sign`}
                className="w-full px-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-serif italic text-lg text-blue-900 bg-blue-50/30 placeholder:text-blue-200"
                disabled={loading}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
              disabled={loading || (action !== 'approve' && !notes.trim())}
            >
              {loading ? 'Processing...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
