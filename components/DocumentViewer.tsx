'use client';

import { useState } from 'react';

interface DocumentViewerProps {
  fileId: string;
  filename: string;
  mimeType: string;
}

export default function DocumentViewer({ fileId, filename, mimeType }: DocumentViewerProps) {
  const [isConverting, setIsConverting] = useState(false);
  const [editUrl, setEditUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if file can be converted to Google Workspace format
  const isConvertible = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ].includes(mimeType);

  const handleConvertAndEdit = async () => {
    setIsConverting(true);
    setError(null);

    try {
      const response = await fetch('/api/documents/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fileId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to convert document');
      }

      const data = await response.json();
      setEditUrl(data.editUrl);
      
      // Open in new tab
      window.open(data.editUrl, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert document');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    window.open(`/api/files/${fileId}`, '_blank');
  };

  const getFileIcon = () => {
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return (
        <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      );
    } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return (
        <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      );
    } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return (
        <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      );
    } else if (mimeType.includes('pdf')) {
      return (
        <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      );
    } else if (mimeType.includes('image')) {
      return (
        <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
      </svg>
    );
  };

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{getFileIcon()}</div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">{filename}</h4>
          
          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
          
          {editUrl && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Converted to Google format
            </p>
          )}
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDownload}
              className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Download
            </button>
            
            {isConvertible && (
              <button
                onClick={handleConvertAndEdit}
                disabled={isConverting}
                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isConverting ? 'Converting...' : editUrl ? 'Open Editor' : 'Edit Online'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
