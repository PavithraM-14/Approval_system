'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, EnvelopeIcon, PaperClipIcon } from '@heroicons/react/24/outline';

interface GmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    _id: string;
    requestId: string;
    title: string;
    requester: {
      name: string;
      email: string;
    };
  };
  currentUser: {
    name: string;
    email: string;
    gmailEnabled?: boolean;
  };
  defaultRecipient?: {
    name: string;
    email: string;
  };
}

export default function GmailComposeModal({
  isOpen,
  onClose,
  request,
  currentUser,
  defaultRecipient
}: GmailComposeModalProps) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Set default values when modal opens
      const recipient = defaultRecipient || request.requester;
      setTo(recipient.email);
      setSubject(`Regarding Request #${request.requestId}: ${request.title}`);
      setMessage(`Dear ${recipient.name},

I hope this email finds you well.

I am writing regarding your request #${request.requestId} - "${request.title}".

[Please add your message here]

Best regards,
${currentUser.name}

---
This email was sent via the Enterprise Approval System.
Request Link: ${window.location.origin}/dashboard/requests/${request._id}`);
    } else {
      // Reset form when modal closes
      setTo('');
      setCc('');
      setSubject('');
      setMessage('');
      setShowCc(false);
    }
  }, [isOpen, defaultRecipient, request, currentUser]);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !message.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSending(true);

      const response = await fetch('/api/documents/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request._id,
          recipientEmail: to,
          recipientName: to.split('@')[0], // Extract name from email if not provided
          ccEmail: cc || undefined,
          subject,
          message,
          useGmail: currentUser.gmailEnabled
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      alert('Email sent successfully!');
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <EnvelopeIcon className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Compose Email</h3>
            {currentUser.gmailEnabled && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Gmail
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={sending}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* To Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To *
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="recipient@example.com"
              disabled={sending}
            />
          </div>

          {/* CC Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                CC
              </label>
              {!showCc && (
                <button
                  onClick={() => setShowCc(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  disabled={sending}
                >
                  Add CC
                </button>
              )}
            </div>
            {showCc && (
              <input
                type="email"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="cc@example.com"
                disabled={sending}
              />
            )}
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Email subject"
              disabled={sending}
            />
          </div>

          {/* Message Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Type your message here..."
              disabled={sending}
            />
          </div>

          {/* Request Context */}
          <div className="bg-gray-50 p-3 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Request Context</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Request ID:</strong> #{request.requestId}</div>
              <div><strong>Title:</strong> {request.title}</div>
              <div><strong>Requester:</strong> {request.requester.name} ({request.requester.email})</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {currentUser.gmailEnabled 
              ? 'Email will be sent via your connected Gmail account' 
              : 'Email will be sent via system SMTP'
            }
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={sending}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !to.trim() || !subject.trim() || !message.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}