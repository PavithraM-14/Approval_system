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
  XMarkIcon
} from '@heroicons/react/24/outline';
import { FolderIcon as FolderIconSolid } from '@heroicons/react/24/solid';

interface Document {
  _id: string;
  title: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
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

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

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
      setDocuments(docsData.documents || []);
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

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (['pdf'].includes(type)) return '📄';
    if (['doc', 'docx'].includes(type)) return '📝';
    if (['xls', 'xlsx'].includes(type)) return '📊';
    if (['ppt', 'pptx'].includes(type)) return '📽️';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(type)) return '🖼️';
    if (['zip', 'rar'].includes(type)) return '📦';
    return '📄';
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
            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
              showFilters ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FunnelIcon className="h-5 w-5" />
            Filters
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
                        <span className="text-2xl flex-shrink-0 mt-1">{getFileIcon(doc.fileType)}</span>
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
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                                  doc.requestStatus === 'approved' ? 'bg-green-100 text-green-800' :
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        doc.category === 'Equipment' ? 'bg-blue-100 text-blue-800' :
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex items-center justify-center gap-2">
                        {doc.isRequestAttachment ? (
                          <>
                            <a
                              href={`/api/view?file=${encodeURIComponent(doc.filePath)}`}
                              className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                            <a
                              href={`/api/download?file=${encodeURIComponent(doc.filePath)}`}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Download
                            </a>
                          </>
                        ) : (
                          <>
                            <a
                              href={`/api/documents/${doc._id}?action=view`}
                              className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                            <a
                              href={`/api/documents/${doc._id}?action=download`}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                            >
                              Download
                            </a>
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
    </div>
  );
}
