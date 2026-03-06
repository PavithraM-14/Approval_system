'use client';

import { useEffect, useState } from 'react';

interface AttachmentListProps {
  attachments: string[];
  title?: string;
  className?: string;
  highlightColor?: 'blue' | 'green';
}

interface FileMetadata {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export default function AttachmentList({ 
  attachments, 
  title = 'Attachments',
  className = '',
  highlightColor = 'blue'
}: AttachmentListProps) {
  const [fileMetadata, setFileMetadata] = useState<Record<string, FileMetadata>>({});
  const [loading, setLoading] = useState(true);
  const [convertingFiles, setConvertingFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true);
      const metadata: Record<string, FileMetadata> = {};

      for (const fileId of attachments) {
        try {
          // Check if this is a file path (contains slashes) or a MongoDB ID
          const isFilePath = fileId.includes('/') || fileId.includes('\\');
          
          if (isFilePath) {
            // Extract filename from path
            const fileName = fileId.split('/').pop() || fileId.split('\\').pop() || fileId;
            const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
            
            // Create metadata from file path
            const mimeTypes: Record<string, string> = {
              'pdf': 'application/pdf',
              'doc': 'application/msword',
              'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'xls': 'application/vnd.ms-excel',
              'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'ppt': 'application/vnd.ms-powerpoint',
              'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'png': 'image/png',
              'gif': 'image/gif',
              'txt': 'text/plain',
            };
            
            metadata[fileId] = {
              _id: fileId,
              originalName: fileName,
              mimeType: mimeTypes[fileExt] || 'application/octet-stream',
              size: 0, // Size unknown for file paths
            };
          } else {
            // Fetch from MongoDB
            const response = await fetch(`/api/files/${fileId}`);
            if (response.ok) {
              const data = await response.json();
              metadata[fileId] = data;
            }
          }
        } catch (error) {
          console.error(`Failed to fetch metadata for ${fileId}:`, error);
        }
      }

      setFileMetadata(metadata);
      setLoading(false);
    };

    if (attachments.length > 0) {
      fetchMetadata();
    } else {
      setLoading(false);
    }
  }, [attachments]);

  const isEditableOnline = (mimeType: string) => {
    return [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ].includes(mimeType);
  };

  const handleEditOnline = async (fileId: string) => {
    setConvertingFiles(prev => new Set(prev).add(fileId));

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
      
      // Open the editor immediately (whether newly converted or already converted)
      window.open(data.editUrl, '_blank');
      
      // Update file metadata to reflect it's now converted
      setFileMetadata(prev => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          googleFileId: data.googleFileId,
          googleFileType: data.googleFileType,
        } as any,
      }));
    } catch (error) {
      console.error('Edit online error:', error);
      alert(error instanceof Error ? error.message : 'Failed to open editor');
    } finally {
      setConvertingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  if (attachments.length === 0) {
    return null;
  }

  const bgColor = highlightColor === 'green' ? 'bg-green-50' : 'bg-white';
  const textColor = highlightColor === 'green' ? 'text-green-800' : 'text-gray-900';

  return (
    <div className={className}>
      <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 bg-gray-100 px-3 py-2 rounded-md">
        {title}
      </h4>
      <div className="border rounded-lg divide-y divide-gray-200">
        {attachments.map((fileId, i) => {
          const metadata = fileMetadata[fileId];
          const fileName = metadata?.originalName || 'Loading...';
          const isPDF = fileName.toLowerCase().endsWith('.pdf');
          const isConverting = convertingFiles.has(fileId);
          const canEditOnline = metadata && isEditableOnline(metadata.mimeType);

          return (
            <div 
              key={i} 
              className={`p-3 flex flex-col xs:flex-row xs:justify-between xs:items-center gap-2 ${bgColor}`}
            >
              <span className={`text-xs sm:text-sm break-all flex-1 min-w-0 ${textColor}`}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  fileName
                )}
              </span>
              <div className="flex gap-2">
                {/* View Button (only for PDFs) */}
                {isPDF && !loading && (
                  <a 
                    href={`/api/view?file=${encodeURIComponent(fileId)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800 transition-colors text-xs sm:text-sm font-medium px-2 py-1 rounded bg-green-50 hover:bg-green-100 whitespace-nowrap flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </a>
                )}
                
                {/* Edit Online Button (for Word, Excel, PowerPoint) */}
                {canEditOnline && !loading && (
                  <button
                    onClick={() => handleEditOnline(fileId)}
                    disabled={isConverting}
                    className="text-purple-600 hover:text-purple-800 transition-colors text-xs sm:text-sm font-medium px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 whitespace-nowrap flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConverting ? (
                      <>
                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Converting...
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Online
                      </>
                    )}
                  </button>
                )}
                
                {/* Download Button */}
                {!loading && (
                  <a 
                    href={`/api/download?file=${encodeURIComponent(fileId)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 transition-colors text-xs sm:text-sm font-medium px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 whitespace-nowrap flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}