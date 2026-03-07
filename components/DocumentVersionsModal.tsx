import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Version {
    _id: string;
    version: number;
    fileName: string;
    filePath: string;
    fileSize: number;
    uploadDate: string;
    uploadedBy: {
        name: string;
        email: string;
    };
    createdAt: string;
}

interface DocumentVersionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: string;
    documentTitle: string;
    currentFileName: string;
    currentVersion: number;
    onVersionUploaded?: () => void;
    canEdit?: boolean;
}

export default function DocumentVersionsModal({
    isOpen,
    onClose,
    documentId,
    documentTitle,
    currentFileName,
    currentVersion,
    onVersionUploaded,
    canEdit = false
}: DocumentVersionsModalProps) {
    const [versions, setVersions] = useState<Version[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        if (isOpen && documentId) {
            fetchVersions();
        }
    }, [isOpen, documentId]);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/documents/${documentId}/versions`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (response.ok) {
                setVersions(data.versions || []);
            }
        } catch (error) {
            console.error('Failed to fetch versions', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadNewVersion = async () => {
        if (!file) return;
        setUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('comment', 'New version upload');

        try {
            const response = await fetch(`/api/documents/${documentId}/versions`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (response.ok) {
                setFile(null);
                if (onVersionUploaded) onVersionUploaded();
                await fetchVersions();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to upload new version');
            }
        } catch (error) {
            console.error('Failed to upload new version', error);
            alert('Failed to upload new version');
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">
                        Version History: {documentTitle}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Upload New Version Section - Only show if user has canEdit permission */}
                    {canEdit && (
                        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Upload New Version</h4>
                            <div className="flex items-center gap-3">
                                <input
                                    type="file"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                <button
                                    onClick={handleUploadNewVersion}
                                    disabled={!file || uploading}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                                >
                                    {uploading ? 'Uploading...' : 'Upload Version'}
                                </button>
                            </div>
                            {currentVersion && currentVersion > 0 && <p className="text-xs text-gray-500 mt-2">Uploading will overwrite the current version ({currentVersion}) and archive the existing file.</p>}
                        </div>
                    )}

                    {/* Versions List */}
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Previous Versions ({versions.length})</h4>

                    {loading ? (
                        <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <p className="text-sm text-gray-500">No previous versions available.</p>
                        </div>
                    ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Version</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">File</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Uploader</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {versions.map((ver) => (
                                        <tr key={ver._id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-900">v{ver.version}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[150px]" title={ver.fileName}>
                                                {ver.fileName}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{ver.uploadedBy?.name || 'Unknown'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {new Date(ver.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <a
                                                    href={`/api/download?file=${encodeURIComponent(ver.filePath)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                >
                                                    Download
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
