'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, EnvelopeIcon, PaperClipIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }>;
}

interface GmailImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (importedDocs?: any[]) => void;
}

export default function GmailImportModal({ isOpen, onClose, onImportComplete }: GmailImportModalProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('Other');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadEmails();
    }
  }, [isOpen]);

  const loadEmails = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/gmail/import?maxResults=20');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load emails');
      }

      setEmails(data.emails || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedEmail || selectedAttachments.length === 0) {
      setError('Please select at least one attachment');
      return;
    }

    setImporting(true);
    setError('');

    try {
      // Find the selected email details
      const emailDetails = emails.find(e => e.id === selectedEmail);
      if (!emailDetails) {
        throw new Error('Email details not found');
      }

      // Get the actual attachment objects
      const attachmentsToImport = emailDetails.attachments.filter(att => 
        selectedAttachments.includes(att.attachmentId)
      );

      if (attachmentsToImport.length === 0) {
        throw new Error('No valid attachments selected');
      }

      console.log('[Import] Sending request with:', {
        messageId: selectedEmail,
        attachments: attachmentsToImport.map(a => ({
          id: a.attachmentId,
          filename: a.filename,
          size: a.size
        }))
      });

      const response = await fetch('/api/gmail/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: selectedEmail,
          attachmentIds: selectedAttachments,
          emailDetails: emailDetails, // Pass the email details directly
          department,
          category,
          tags: ['gmail-import'],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import attachments');
      }

      // Show detailed results
      if (data.count > 0) {
        alert(`Successfully imported ${data.count} document(s)!`);
        onImportComplete?.(data.imported); // Pass imported documents to callback
        onClose();
      } else {
        // Show errors if any
        const errorMsg = data.errors && data.errors.length > 0 
          ? `Import failed:\n${data.errors.join('\n')}`
          : 'No documents were imported. Please check the console for errors.';
        setError(errorMsg);
        console.error('Import errors:', data.errors);
        console.error('Email attachments:', emailDetails.attachments);
        console.error('Selected IDs:', selectedAttachments);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to import';
      setError(errorMsg);
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  };

  const toggleAttachment = (attachmentId: string) => {
    setSelectedAttachments(prev =>
      prev.includes(attachmentId)
        ? prev.filter(id => id !== attachmentId)
        : [...prev, attachmentId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <EnvelopeIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Import from Gmail</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading emails...</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12">
              <EnvelopeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No emails with attachments found</p>
              <button
                onClick={loadEmails}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Refresh
              </button>
            </div>
          ) : (
            <>
              {/* Import Settings */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-3">Import Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g., IT, HR, Finance"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Other">Other</option>
                      <option value="Policy">Policy</option>
                      <option value="Procedure">Procedure</option>
                      <option value="Form">Form</option>
                      <option value="Report">Report</option>
                      <option value="Contract">Contract</option>
                      <option value="Invoice">Invoice</option>
                      <option value="Receipt">Receipt</option>
                      <option value="Proposal">Proposal</option>
                      <option value="Presentation">Presentation</option>
                      <option value="Spreadsheet">Spreadsheet</option>
                      <option value="Image">Image</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Email List */}
              <div className="space-y-4">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className={`border rounded-lg p-4 ${
                      selectedEmail === email.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{email.subject}</h4>
                        <p className="text-sm text-gray-600 mt-1">From: {email.from}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(email.date).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Attachments */}
                    {email.attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-gray-700">
                          Attachments ({email.attachments.length}):
                        </p>
                        {email.attachments.map((attachment) => (
                          <label
                            key={attachment.attachmentId}
                            className="flex items-center gap-3 p-2 bg-white border rounded hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedAttachments.includes(attachment.attachmentId)}
                              onChange={() => {
                                setSelectedEmail(email.id);
                                toggleAttachment(attachment.attachmentId);
                              }}
                              className="h-4 w-4 text-blue-600 rounded"
                            />
                            <PaperClipIcon className="h-4 w-4 text-gray-400" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{attachment.filename}</p>
                              <p className="text-xs text-gray-500">
                                {(attachment.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <p className="text-sm text-gray-600">
            {selectedAttachments.length} attachment(s) selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || selectedAttachments.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              {importing ? 'Importing...' : 'Import Selected'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
