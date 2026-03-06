'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  FunnelIcon,
  XMarkIcon,
  ShareIcon,
  DocumentTextIcon,
  TableCellsIcon,
  PresentationChartBarIcon,
  PhotoIcon,
  ArchiveBoxIcon,
  EnvelopeIcon,
  ArrowDownTrayIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { FolderIcon as FolderIconSolid } from '@heroicons/react/24/solid';
import GmailImportModal from '../../../components/GmailImportModal';
import SendEmailModal from '../../../components/SendEmailModal';
import DocumentVersionsModal from '../../../components/DocumentVersionsModal';

interface Document {
  _id: string;
  title: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  mimeType?: string;
  department: string;
  project?: string;
  category: string;
  tags: string[];
  status: string;
  uploadedBy: {
    name: string;
    email: string;
  };
  createdAt: string;
  downloadCount: number;
  viewCount: number;
  isRequestAttachment?: boolean;
  requestId?: string;
  requestMongoId?: string;
  requestStatus?: string;
  version?: number;
}

interface Folder {
  _id: string;
  name: string;
  description?: string;
  department: string;
  project?: string;
  path: string;
  color: string;
  createdAt: string;
}
interface FileMetadata {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [fileMetadata, setFileMetadata] = useState<Record<string, FileMetadata>>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [convertingFiles, setConvertingFiles] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [shareLink, setShareLink] = useState('');
  const [showGmailImport, setShowGmailImport] = useState(false);
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [selectedDocForEmail, setSelectedDocForEmail] = useState<Document | null>(null);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [selectedDocForVersions, setSelectedDocForVersions] = useState<Document | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    department: '',
    category: '',
    status: 'active',
    tags: ''
  });

  useEffect(() => {
    fetchData();
  }, [currentFolder, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch folders
      const folderParams = new URLSearchParams();
      if (currentFolder) folderParams.append('parentId', currentFolder);
      if (filters.department) folderParams.append('department', filters.department);

      const foldersRes = await fetch(`/api/folders?${folderParams.toString()}`, {
        credentials: 'include'
      });
      const foldersData = await foldersRes.json();
      setFolders(foldersData.folders || []);

      // Fetch documents
      const docParams = new URLSearchParams();
      if (currentFolder) docParams.append('folderId', currentFolder);
      if (filters.department) docParams.append('department', filters.department);
      if (filters.category) docParams.append('category', filters.category);
      if (filters.status) docParams.append('status', filters.status);
      if (filters.tags) docParams.append('tags', filters.tags);

      const docsRes = await fetch(`/api/documents?${docParams.toString()}`, {
        credentials: 'include'
      });
      const docsData = await docsRes.json();
      const docs = docsData.documents || [];

      setDocuments(docs);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchData();
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ search: searchQuery });
      if (filters.department) params.append('department', filters.department);
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);

      const res = await fetch(`/api/documents?${params.toString()}`, {
        credentials: 'include'
      });
      const data = await res.json();
      setDocuments(data.documents || []);
      setFolders([]); // Hide folders during search
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleShare = async (doc: Document, expiryHours: number) => {
    try {
      const payload = doc.isRequestAttachment
        ? {
          requestAttachment: {
            filePath: doc.filePath,
            fileName: doc.fileName,
            requestId: doc.requestId
          },
          expiryHours,
          watermarkEnabled: true,
          allowDownload: true
        }
        : {
          documentId: doc._id,
          expiryHours,
          watermarkEnabled: true,
          allowDownload: true
        };

      const response = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setShareLink(data.shareLink.url);
        return data.shareLink.url;
      } else {
        alert(data.error || 'Failed to create share link');
      }
    } catch (error) {
      console.error('Share error:', error);
      alert('Failed to create share link');
    }
  };

  const getFileIcon = (doc: Document) => {
    // Check mimeType first (most reliable)
    if (doc.mimeType) {
      if (doc.mimeType === 'application/pdf')
        return <DocumentIcon className="w-6 h-6 text-red-500" />;
      if (doc.mimeType === 'application/msword' ||
        doc.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        return <DocumentTextIcon className="w-6 h-6 text-blue-500" />;
      if (doc.mimeType === 'application/vnd.ms-excel' ||
        doc.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        return <TableCellsIcon className="w-6 h-6 text-green-500" />;
      if (doc.mimeType === 'application/vnd.ms-powerpoint' ||
        doc.mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
        return <PresentationChartBarIcon className="w-6 h-6 text-orange-500" />;
      if (doc.mimeType.startsWith('image/'))
        return <PhotoIcon className="w-6 h-6 text-purple-500" />;
      if (doc.mimeType === 'application/zip' || doc.mimeType === 'application/x-rar-compressed')
        return <ArchiveBoxIcon className="w-6 h-6 text-gray-500" />;
    }

    // Check fileType
    const type = doc.fileType ? doc.fileType.toLowerCase() : '';
    if (['pdf'].includes(type))
      return <DocumentIcon className="w-6 h-6 text-red-500" />;
    if (['doc', 'docx'].includes(type))
      return <DocumentTextIcon className="w-6 h-6 text-blue-500" />;
    if (['xls', 'xlsx'].includes(type))
      return <TableCellsIcon className="w-6 h-6 text-green-500" />;
    if (['ppt', 'pptx'].includes(type))
      return <PresentationChartBarIcon className="w-6 h-6 text-orange-500" />;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(type))
      return <PhotoIcon className="w-6 h-6 text-purple-500" />;
    if (['zip', 'rar'].includes(type))
      return <ArchiveBoxIcon className="w-6 h-6 text-gray-500" />;

    // Fallback: try fileName
    if (doc.fileName) {
      const nameExt = doc.fileName.split('.').pop()?.toLowerCase() || '';
      if (['pdf'].includes(nameExt))
        return <DocumentIcon className="w-6 h-6 text-red-500" />;
      if (['doc', 'docx'].includes(nameExt))
        return <DocumentTextIcon className="w-6 h-6 text-blue-500" />;
      if (['xls', 'xlsx'].includes(nameExt))
        return <TableCellsIcon className="w-6 h-6 text-green-500" />;
      if (['ppt', 'pptx'].includes(nameExt))
        return <PresentationChartBarIcon className="w-6 h-6 text-orange-500" />;
      if (['jpg', 'jpeg', 'png', 'gif'].includes(nameExt))
        return <PhotoIcon className="w-6 h-6 text-purple-500" />;
      if (['zip', 'rar'].includes(nameExt))
        return <ArchiveBoxIcon className="w-6 h-6 text-gray-500" />;
    }

    return <DocumentIcon className="w-6 h-6 text-gray-400" />;
  }

  const isEditableFile = (doc: Document) => {
    const editableTypes = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    
    // Priority 1: Check fileName extension (most reliable for our case)
    if (doc.fileName) {
      const fileNameExt = doc.fileName.split('.').pop()?.toLowerCase() || '';
      if (editableTypes.includes(fileNameExt)) {
        console.log('✅ Editable file detected (fileName):', doc.fileName, fileNameExt);
        return true;
      }
    }

    // Priority 2: Check mimeType
    if (doc.mimeType && doc.mimeType !== 'application/octet-stream') {
      const editableMimeTypes = [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ];
      if (editableMimeTypes.includes(doc.mimeType)) {
        console.log('✅ Editable file detected (mimeType):', doc.fileName, doc.mimeType);
        return true;
      }
    }

    // Priority 3: Check fileType (if not UNKNOWN)
    if (doc.fileType && doc.fileType !== 'UNKNOWN') {
      const type = doc.fileType.toLowerCase().replace(/^\./, '');
      if (editableTypes.includes(type)) {
        console.log('✅ Editable file detected (fileType):', doc.fileName, type);
        return true;
      }
    }

    console.log('❌ Not editable:', doc.fileName);
    return false;
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Document Library</h1>
        <p className="text-gray-600 mt-1">
          Centralized repository for all organizational documents and request attachments
        </p>
        <p className="text-sm text-gray-500 mt-1">
          All users can access documents from their department and view request attachments
        </p>
      </div>

      {/* Search and Actions */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by document name, request ID, department, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Search
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${showFilters ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            <FunnelIcon className="h-5 w-5" />
            Filters
          </button>
          <button
            onClick={() => setShowGmailImport(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            title="Import documents from Gmail"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Import from Gmail
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input
                type="text"
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Engineering"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Categories</option>
                <option value="Policy">Policy</option>
                <option value="Procedure">Procedure</option>
                <option value="Form">Form</option>
                <option value="Report">Report</option>
                <option value="Contract">Contract</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input
                type="text"
                value={filters.tags}
                onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="comma separated"
              />
            </div>
          </div>
        )}
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Folders</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {folders.map((folder) => (
              <button
                key={folder._id}
                onClick={() => setCurrentFolder(folder._id)}
                className="flex flex-col items-center p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-md transition"
              >
                <FolderIconSolid className="h-12 w-12 mb-2" style={{ color: folder.color }} />
                <span className="text-sm font-medium text-gray-900 text-center line-clamp-2">
                  {folder.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Documents ({documents.length})
        </h2>
        {documents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No documents found</p>
            <p className="text-sm text-gray-500 mt-2">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Uploaded By
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-1">{getFileIcon(doc)}</span>
                        <div className="min-w-0 flex-1">
                          {/* Main Title - Request Name */}
                          <div className="text-base font-semibold text-gray-900 mb-1">
                            {doc.title}
                          </div>

                          {/* Filename */}
                          <div className="text-xs text-gray-500 mb-2">
                            {doc.fileName}
                          </div>

                          {/* Badges */}
                          {doc.isRequestAttachment && (
                            <div className="flex flex-wrap gap-1.5">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                Request #{doc.requestId}
                              </span>
                              {doc.requestStatus && (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${doc.requestStatus === 'approved' ? 'bg-green-100 text-green-800' :
                                  doc.requestStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {doc.requestStatus}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${doc.category === 'Equipment' ? 'bg-blue-100 text-blue-800' :
                        doc.category === 'Software' ? 'bg-purple-100 text-purple-800' :
                          doc.category === 'Travel' ? 'bg-green-100 text-green-800' :
                            doc.category === 'Training' ? 'bg-yellow-100 text-yellow-800' :
                              doc.category === 'Infrastructure' ? 'bg-indigo-100 text-indigo-800' :
                                doc.category === 'Policy' ? 'bg-pink-100 text-pink-800' :
                                  doc.category === 'Report' ? 'bg-teal-100 text-teal-800' :
                                    doc.category === 'Leave' ? 'bg-orange-100 text-orange-800' :
                                      'bg-gray-100 text-gray-800'
                        }`}>
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {doc.uploadedBy.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <div className="flex flex-wrap items-center justify-center gap-2 max-w-sm md:max-w-md lg:max-w-lg">
                        {doc.isRequestAttachment ? (
                          <>
                            <a
                              href={`/api/view?file=${encodeURIComponent(doc.filePath)}`}
                              className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium text-xs"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                            {/* Edit Online Button (for Word, Excel, PowerPoint) */}
                            {isEditableFile(doc) && (
                              <button
                                onClick={() => handleEditOnline(doc.filePath)}
                                disabled={convertingFiles.has(doc.filePath)}
                                className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {convertingFiles.has(doc.filePath) ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Converting...
                                  </>
                                ) : (
                                  <>
                                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Online
                                  </>
                                )}
                              </button>
                            )}
                            <a
                              href={`/api/download?file=${encodeURIComponent(doc.filePath)}`}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-xs"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Download
                            </a>
                            <button
                              onClick={() => {
                                setSelectedDocument(doc);
                                setShowShareModal(true);
                              }}
                              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-xs"
                            >
                              <ShareIcon className="h-4 w-4 mr-1" />
                              Share
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDocForEmail(doc);
                                setShowSendEmail(true);
                              }}
                              className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium text-xs"
                              title="Send via Gmail"
                            >
                              <EnvelopeIcon className="h-4 w-4 mr-1" />
                              Email
                            </button>
                            <button
                              onClick={() => {
                                console.log('Opening version history for request attachment:', {
                                  id: doc._id,
                                  title: doc.title,
                                  isRequestAttachment: doc.isRequestAttachment
                                });
                                setSelectedDocForVersions(doc);
                                setShowVersionsModal(true);
                              }}
                              className="inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors font-medium text-xs"
                              title="Version History"
                            >
                              <ClockIcon className="h-4 w-4 mr-1" />
                              v{doc.version || 1}
                            </button>
                          </>
                        ) : (
                          <>
                            <a
                              href={`/api/documents/${doc._id}?action=view`}
                              className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium text-xs"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                            {isEditableFile(doc) && (
                              <button
                                onClick={() => handleEditOnline(doc._id)}
                                disabled={convertingFiles.has(doc._id)}
                                className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {convertingFiles.has(doc._id) ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Converting...
                                  </>
                                ) : (
                                  <>
                                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Online
                                  </>
                                )}
                              </button>
                            )}
                            <a
                              href={`/api/documents/${doc._id}?action=download`}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-xs"
                            >
                              Download
                            </a>
                            <button
                              onClick={() => {
                                setSelectedDocument(doc);
                                setShowShareModal(true);
                              }}
                              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-xs"
                            >
                              <ShareIcon className="h-4 w-4 mr-1" />
                              Share
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDocForEmail(doc);
                                setShowSendEmail(true);
                              }}
                              className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium text-xs"
                              title="Send via Gmail"
                            >
                              <EnvelopeIcon className="h-4 w-4 mr-1" />
                              Email
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDocForVersions(doc);
                                setShowVersionsModal(true);
                              }}
                              className="inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors font-medium text-xs"
                              title="Version History"
                            >
                              <ClockIcon className="h-4 w-4 mr-1" />
                              v{doc.version || 1}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && selectedDocument && (
        <ShareModal
          document={selectedDocument}
          onClose={() => {
            setShowShareModal(false);
            setSelectedDocument(null);
            setShareLink('');
          }}
          onShare={handleShare}
          shareLink={shareLink}
        />
      )}

      {/* Gmail Import Modal */}
      <GmailImportModal
        isOpen={showGmailImport}
        onClose={() => setShowGmailImport(false)}
        onImportComplete={() => fetchData()}
      />

      <SendEmailModal
        isOpen={showSendEmail}
        onClose={() => {
          setShowSendEmail(false);
          setSelectedDocForEmail(null);
        }}
        documentId={selectedDocForEmail?._id || ''}
        documentTitle={selectedDocForEmail?.title || ''}
      />

      {/* Document Versions Modal */}
      <DocumentVersionsModal
        isOpen={showVersionsModal}
        onClose={() => {
          setShowVersionsModal(false);
          setSelectedDocForVersions(null);
        }}
        documentId={selectedDocForVersions?._id || ''}
        documentTitle={selectedDocForVersions?.title || ''}
        currentFileName={selectedDocForVersions?.fileName || ''}
        currentVersion={selectedDocForVersions?.version || 1}
        onVersionUploaded={() => fetchData()}
      />
    </div>
  );
}

/* Share Modal Component */
interface ShareModalProps {
  document: Document;
  onClose: () => void;
  onShare: (doc: Document, expiryHours: number) => Promise<string | undefined>;
  shareLink: string;
}

function ShareModal({ document, onClose, onShare, shareLink }: ShareModalProps) {
  const [expiryHours, setExpiryHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(shareLink);

  const handleGenerate = async () => {
    setLoading(true);
    const link = await onShare(document, expiryHours);
    if (link) {
      setGeneratedLink(link);
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Share Document</h3>
        </div>

        <div className="px-6 py-4">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Document:</p>
            <p className="text-sm text-gray-600">{document.title}</p>
          </div>

          {!generatedLink ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link Expiry
                </label>
                <select
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 Hour</option>
                  <option value={24}>24 Hours</option>
                  <option value={168}>7 Days</option>
                  <option value={720}>30 Days</option>
                </select>
              </div>

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> The shared document will be watermarked with access information for security. Office documents (Word, Excel, PowerPoint) will be converted to PDF with watermark applied.
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Share Link'}
              </button>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Link (Expires in {expiryHours} hours)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-800">
                  ✓ Share link generated successfully! Anyone with this link can access the document until it expires.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
