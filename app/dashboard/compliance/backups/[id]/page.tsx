'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon, 
  ServerStackIcon, 
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  DocumentDuplicateIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function BackupDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const backupId = params.id as string;

  const [backupData, setBackupData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBackup = async () => {
      try {
        const res = await fetch(`/api/compliance/backups/${backupId}`);
        if (!res.ok) throw new Error('Failed to load backup');
        const data = await res.json();
        setBackupData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBackup();
  }, [backupId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !backupData) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
        <ServerStackIcon className="h-16 w-16 text-rose-300 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800">Snapshot Not Found</h1>
        <p className="text-slate-500 mt-2 mb-6">The backup archive you requested could not be located or may be corrupted.</p>
        <Link 
          href="/dashboard/compliance"
          className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition"
        >
          Return to Compliance
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{backupData.backupId}</h1>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Verified Archive
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Snapshot taken on {new Date(backupData.date).toLocaleString()}
              </p>
            </div>
          </div>
          
          <button className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition-colors border border-blue-200">
            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
            Download Archive
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <DocumentDuplicateIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Requests Saved</p>
              <p className="text-2xl font-bold text-slate-900">{backupData.requests?.length || 0}</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <TagIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Backup Type</p>
              <p className="text-2xl font-bold text-slate-900">{backupData.type || 'Full System'}</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <CalendarDaysIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Archive Retention End</p>
              <p className="text-2xl font-bold text-slate-900">
                {new Date(new Date(backupData.date).setFullYear(new Date(backupData.date).getFullYear() + 7)).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Contents Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900">Archived Requests</h2>
            <p className="text-sm text-slate-500">Read-only view of all requests state at the time of snapshot.</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 px-6 font-semibold">Request ID</th>
                  <th className="p-4 font-semibold">Title</th>
                  <th className="p-4 font-semibold">Department</th>
                  <th className="p-4 font-semibold">Snapshot Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {backupData.requests?.map((req: any, idx: number) => (
                  <tr key={req._id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 px-6 font-mono text-xs text-slate-500">{req._id || `req_${idx}`}</td>
                    <td className="p-4 font-medium text-slate-900">{req.title || req.name || 'Untitled Request'}</td>
                    <td className="p-4 text-slate-600">{req.department || req.college || 'N/A'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        req.status === 'approved' || req.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        req.status === 'pending' || req.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        req.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {req.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                      </span>
                    </td>
                  </tr>
                ))}
                
                {(!backupData.requests || backupData.requests.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No requests were found in this snapshot archive.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
