'use client';

import { useState } from 'react';
import { 
  ShieldCheckIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowRightIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

interface AdminOverridePanelProps {
  request: {
    _id: string;
    requestId: string;
    title: string;
    status: string;
    requester: {
      name: string;
      email: string;
    };
  };
  currentUser: {
    role: {
      isSystemAdmin: boolean;
    };
  };
  onAction: (action: 'approve' | 'reject' | 'forward', notes: string) => Promise<void>;
  onSendEmail: () => void;
  loading?: boolean;
}

export default function AdminOverridePanel({ 
  request, 
  currentUser, 
  onAction, 
  onSendEmail,
  loading = false 
}: AdminOverridePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'forward' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Only show for system admins
  if (!currentUser?.role?.isSystemAdmin) {
    return null;
  }

  // Don't show for already completed requests
  if (request.status === 'approved' || request.status === 'rejected') {
    return null;
  }

  const handleSubmit = async () => {
    if (!selectedAction) return;

    try {
      setProcessing(true);
      await onAction(selectedAction, notes);
      setSelectedAction(null);
      setNotes('');
      setIsExpanded(false);
    } catch (error) {
      console.error('Admin override error:', error);
      alert('Failed to process admin override');
    } finally {
      setProcessing(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'approve': return 'bg-green-600 hover:bg-green-700 text-white';
      case 'reject': return 'bg-red-600 hover:bg-red-700 text-white';
      case 'forward': return 'bg-blue-600 hover:bg-blue-700 text-white';
      default: return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approve': return CheckCircleIcon;
      case 'reject': return XCircleIcon;
      case 'forward': return ArrowRightIcon;
      default: return ShieldCheckIcon;
    }
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <ShieldCheckIcon className="h-5 w-5 text-red-600 mr-2" />
          <h3 className="text-sm font-medium text-red-800">System Administrator Override</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onSendEmail}
            className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <EnvelopeIcon className="h-3 w-3 mr-1" />
            Send Email
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            {isExpanded ? 'Hide' : 'Take Action'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-red-700">
            As a system administrator, you can override the normal approval workflow and take direct action on this request.
          </p>

          {/* Action Selection */}
          <div className="grid grid-cols-3 gap-2">
            {['approve', 'reject', 'forward'].map((action) => {
              const Icon = getActionIcon(action);
              return (
                <button
                  key={action}
                  onClick={() => setSelectedAction(action as any)}
                  className={`flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md border-2 transition-all ${
                    selectedAction === action
                      ? getActionColor(action) + ' border-transparent'
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </button>
              );
            })}
          </div>

          {/* Notes Input */}
          {selectedAction && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes {selectedAction === 'reject' ? '(Required)' : '(Optional)'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Provide notes for this ${selectedAction} action...`}
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                disabled={processing}
              />
            </div>
          )}

          {/* Submit Button */}
          {selectedAction && (
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setSelectedAction(null);
                  setNotes('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={processing || (selectedAction === 'reject' && !notes.trim()) || loading}
                className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 ${getActionColor(selectedAction)}`}
              >
                {processing ? 'Processing...' : `${selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)} Request`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}