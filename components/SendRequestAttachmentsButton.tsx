'use client';

import { useState } from 'react';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import SendEmailModal from './SendEmailModal';

interface SendRequestAttachmentsButtonProps {
  requestId: string;
  requestTitle: string;
  attachments: string[];
  className?: string;
}

export default function SendRequestAttachmentsButton({
  requestId,
  requestTitle,
  attachments,
  className = ''
}: SendRequestAttachmentsButtonProps) {
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handleSendAttachment = (attachment: string) => {
    setSelectedAttachment(attachment);
    setShowSendEmail(true);
    setShowAttachmentMenu(false);
  };

  return (
    <>
      <div className={`relative ${className}`}>
        {attachments.length === 1 ? (
          // Single attachment - direct button
          <button
            onClick={() => handleSendAttachment(attachments[0])}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium gap-2"
          >
            <EnvelopeIcon className="h-5 w-5" />
            Send Attachment via Email
          </button>
        ) : (
          // Multiple attachments - dropdown menu
          <>
            <button
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium gap-2"
            >
              <EnvelopeIcon className="h-5 w-5" />
              Send Attachment via Email
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAttachmentMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowAttachmentMenu(false)}
                />
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-y-auto">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Select Attachment to Send
                    </div>
                    {attachments.map((attachment, index) => {
                      const filename = attachment.split('/').pop() || attachment;
                      return (
                        <button
                          key={index}
                          onClick={() => handleSendAttachment(attachment)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md transition-colors flex items-center gap-2 group"
                        >
                          <svg className="h-5 w-5 text-gray-400 group-hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">
                            {filename}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Send Email Modal */}
      {selectedAttachment && (
        <SendEmailModal
          isOpen={showSendEmail}
          onClose={() => {
            setShowSendEmail(false);
            setSelectedAttachment(null);
          }}
          documentId=""
          documentTitle={`${requestTitle} - ${selectedAttachment.split('/').pop()}`}
          // For request attachments, we'll need to modify SendEmailModal to handle file paths
          filePath={selectedAttachment}
        />
      )}
    </>
  );
}
