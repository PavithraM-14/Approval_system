'use client';

import { useState } from 'react';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { User } from '../lib/types';

interface OptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    _id: string;
    title: string;
    purpose: string;
    requester: { name: string };
  };
  user: User | null;
  availableOptions: Array<{
    id: string;
    label: string;
    roleId?: string;
    roleName?: string;
    description?: string;
  }>;
  onSubmit: (selectedOptions: string[], notes: string) => void;
  loading?: boolean;
}

export default function OptionsModal({
  isOpen,
  onClose,
  request,
  user,
  availableOptions,
  onSubmit,
  loading = false
}: OptionsModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (selectedOptions.length === 0) {
      alert('Please select at least one option');
      return;
    }
    
    onSubmit(selectedOptions, notes || 'Forwarded to selected options');
  };

  const handleClose = () => {
    setSelectedOptions([]);
    setNotes('');
    onClose();
  };

  const toggleOption = (optionId: string) => {
    setSelectedOptions(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Forward Options
              </h3>
              <p className="text-sm text-gray-500">
                {request.title}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Select one or more users to forward this request to. The selected users will be able to process this request in parallel.
            </p>
          </div>

          {/* Available Options */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Users to Forward To *
            </label>
            <div className="space-y-3">
              {availableOptions.map((option) => (
                <div
                  key={option.id}
                  className={`
                    p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${selectedOptions.includes(option.id)
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onClick={() => toggleOption(option.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      <div
                        className={`
                          w-4 h-4 rounded border-2 flex items-center justify-center
                          ${selectedOptions.includes(option.id)
                            ? 'border-teal-500 bg-teal-500'
                            : 'border-gray-300'
                          }
                        `}
                      >
                        {selectedOptions.includes(option.id) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {option.label}
                      </div>
                      {option.roleName && (
                        <div className="text-sm text-gray-500">
                          Role: {option.roleName}
                        </div>
                      )}
                      {option.description && (
                        <div className="text-sm text-gray-600 mt-1">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about your forwarding decision..."
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || selectedOptions.length === 0}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Forward to {selectedOptions.length} {selectedOptions.length === 1 ? 'User' : 'Users'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
