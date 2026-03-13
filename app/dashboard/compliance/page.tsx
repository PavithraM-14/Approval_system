'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheckIcon, DocumentTextIcon, ClockIcon, ExclamationTriangleIcon, TrashIcon, ArchiveBoxIcon, ServerStackIcon, CloudArrowUpIcon, ArrowDownTrayIcon, CheckBadgeIcon, PlusIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline';

export default function CompliancePage() {
  const [stats, setStats] = useState<any>({
    compliant: 0,
    expiringSoon: 0,
    pendingReviews: 0,
    auditLogs: 0
  });
  const [policies, setPolicies] = useState<any[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Backup State
  const [backups, setBackups] = useState<any[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isCreatePolicyModalOpen, setIsCreatePolicyModalOpen] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ name: '', description: '', retentionPeriodYears: 1, action: 'archive' });
  
  // Privacy Ops State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportEmail, setExportEmail] = useState('');
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      const [statsRes, policiesRes, backupsRes] = await Promise.all([
        fetch('/api/compliance/stats', { credentials: 'include' }).catch(() => null),
        fetch('/api/retention/policies', { credentials: 'include' }).catch(() => null),
        fetch('/api/compliance/backups', { credentials: 'include' }).catch(() => null)
      ]);

      if (statsRes?.ok) {
        const data = await statsRes.json();
        setStats(data);
        setExpiringDocs(data.expiringDocuments || expiringDocs);
      }

      if (policiesRes?.ok) {
        const data = await policiesRes.json();
        setPolicies(data.policies || policies);
      }

      if (backupsRes?.ok) {
        const data = await backupsRes.json();
        if (data.backups?.length > 0) {
          // Format backup dates dynamically
          const formattedBackups = data.backups.map((b: any) => ({
            ...b,
            date: new Date(b.date).toLocaleString(),
          }));
          
          // Combine dynamic backups with static defaults (for presentation) 
          // such that dynamic ones show up on top
          setBackups([...formattedBackups, ...backups]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch compliance data:', error);
    } finally {
      // Small delay for smooth entry animation
      setTimeout(() => setLoading(false), 600);
    }
  };

  const handleApplyPolicies = async () => {
    if (!confirm('Apply retention policies now? This will permanently archive/delete documents based on configured rules.')) {
      return;
    }

    try {
      const response = await fetch('/api/retention/apply', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Retention policies applied:\n- Archived: ${data.results?.archived || 0}\n- Deleted: ${data.results?.deleted || 0}\n- Flagged for review: ${data.results?.flaggedForReview || 0}`);
        fetchComplianceData();
      } else {
        alert('Failed to apply retention policies.');
      }
    } catch (error) {
      console.error('Failed to apply policies:', error);
      alert('Error applying retention policies.');
    }
  };

  const handleTriggerBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/compliance/backups', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.backup) {
          data.backup.date = new Date(data.backup.date).toLocaleString();
          setBackups([data.backup, ...backups]);
        }
      } else {
        alert('Failed to trigger backup.');
      }
    } catch (err) {
      console.error(err);
      alert('Error triggering backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleExportDataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exportEmail) return;
    
    // In a real app, this would be an API call
    setTimeout(() => {
      alert(`Data export process initiated for ${exportEmail}. A secure download link will be emailed to the DPO.`);
      setIsExportModalOpen(false);
      setExportEmail('');
    }, 500);
  };

  const handleDeleteDataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteEmail || deleteConfirmation !== 'DELETE') return;
    
    // In a real app, this would be an API call
    setTimeout(() => {
      alert(`All identified records for ${deleteEmail} have been queued for secure deletion.`);
      setIsDeleteModalOpen(false);
      setDeleteEmail('');
      setDeleteConfirmation('');
    }, 500);
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Map frontend fields (retentionPeriodYears) to backend expected fields (retentionPeriodDays)
      const policyPayload = {
        name: newPolicy.name,
        description: newPolicy.description,
        documentType: 'all',
        category: 'general',
        retentionPeriodDays: newPolicy.retentionPeriodYears * 365,
        action: newPolicy.action,
        notifyBeforeDays: 30
      };

      const res = await fetch('/api/retention/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policyPayload)
      });

      if (res.ok) {
        setIsCreatePolicyModalOpen(false);
        setNewPolicy({ name: '', description: '', retentionPeriodYears: 1, action: 'archive' });
        fetchComplianceData(); // Refresh list from backend
      } else {
        const err = await res.json();
        alert(`Failed to create policy: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error creating policy');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-xl bg-blue-500/30 animate-pulse"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 relative z-10"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 pb-8 pt-8 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Compliance & Governance
            </h1>
            <p className="mt-2 text-slate-600 text-lg max-w-2xl">
              Centralized command center for retention policies, system backups, and regulatory audits.
            </p>
          </div>
          <button
            onClick={handleApplyPolicies}
            className="inline-flex items-center justify-center px-6 py-3 font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
          >
            <ShieldCheckIcon className="w-5 h-5 mr-2" />
            Enforce Policies
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-8 space-y-8">
        


        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="xl:col-span-2 space-y-8">
            


            {/* Retention Policies */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Active Retention Policies</h2>
                  <p className="text-sm text-slate-500 mt-1">Rules governing document lifecycles and automated purging.</p>
                </div>
                <button
                  onClick={() => setIsCreatePolicyModalOpen(true)}
                  className="flex items-center justify-center px-4 py-2 bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200 transition-colors text-sm shrink-0"
                >
                  <PlusIcon className="w-4 h-4 mr-1.5" />
                  New Policy
                </button>
              </div>
              <div className="p-0">
                {policies.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {policies.map((policy, index) => (
                      <li key={index} className="p-6 hover:bg-slate-50 transition-colors">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                          <div>
                            <h3 className="font-bold text-slate-900 text-lg">{policy.name}</h3>
                            <p className="text-sm text-slate-600 mt-1">{policy.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs font-medium text-slate-500">
                              <span className="flex items-center bg-slate-100 px-2 py-1 rounded-md">
                                <ClockIcon className="w-4 h-4 mr-1 text-slate-400" />
                                {policy.retentionPeriodDays ? `${Math.round(policy.retentionPeriodDays / 365)} Years` : `${policy.retentionPeriodYears} Years`}
                              </span>
                            </div>
                          </div>
                          <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center shadow-sm w-fit ${
                            policy.action === 'archive' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            policy.action === 'delete' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {policy.action === 'archive' && <ArchiveBoxIcon className="h-4 w-4 mr-1.5" />}
                            {policy.action === 'delete' && <TrashIcon className="h-4 w-4 mr-1.5" />}
                            {policy.action}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-12 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 text-slate-400">
                      <ArchiveBoxIcon className="w-8 h-8" />
                    </div>
                    <p className="text-slate-500 font-medium mb-1">No retention policies configured.</p>
                    <p className="text-sm text-slate-400 mb-6">Create a rule to automate document lifecycles.</p>
                    <button
                      onClick={() => setIsCreatePolicyModalOpen(true)}
                      className="flex items-center px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 text-sm cursor-pointer"
                    >
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Create Policy
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Expiring Documents */}
            {expiringDocs.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-xl font-bold text-slate-900">Expiring Documents</h2>
                  <p className="text-sm text-slate-500 mt-1">Items requiring immediate attention or renewal.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-semibold">Document Name</th>
                        <th className="p-4 font-semibold">Type</th>
                        <th className="p-4 font-semibold">Expires In</th>
                        <th className="p-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {expiringDocs.map((doc, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-medium text-slate-900">{doc.title}</td>
                          <td className="p-4 text-slate-600">
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs">{doc.documentType}</span>
                          </td>
                          <td className="p-4">
                            <span className={`font-bold ${doc.daysUntilExpiry <= 7 ? 'text-rose-600' : 'text-amber-600'}`}>
                              {doc.daysUntilExpiry} days
                            </span>
                          </td>
                          <td className="p-4 text-slate-600">{doc.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            
            {/* Backups & Disaster Recovery */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500 rounded-full mix-blend-screen filter blur-xl opacity-50"></div>
                <h2 className="text-xl font-bold flex items-center relative z-10">
                  <ServerStackIcon className="w-6 h-6 mr-2 text-blue-400" />
                  System Backups
                </h2>
                <p className="text-slate-300 text-sm mt-2 relative z-10">Continuous data protection & DR snapshots.</p>
                
                <button 
                  onClick={handleTriggerBackup}
                  disabled={isBackingUp}
                  className={`mt-6 w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center transition-all shadow-lg relative z-10 ${
                    isBackingUp 
                      ? 'bg-slate-700 text-slate-300 cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-400 text-white shadow-blue-500/30'
                  }`}
                >
                  {isBackingUp ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Creating Snapshot...
                    </>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                      Trigger Manual Backup
                    </>
                  )}
                </button>
              </div>
              
              <div className="p-0">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-6 pt-6 pb-2">Recent Snapshots</h3>
                <ul className="divide-y divide-slate-100">
                  {backups.length > 0 ? backups.map((bkp) => (
                    <li key={bkp.id} className="p-4 px-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{bkp.id}</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold rounded-full">
                            {bkp.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{bkp.date} • {bkp.type} • {bkp.size}</p>
                      </div>
                      <Link 
                        href={`/dashboard/compliance/backups/${bkp.id}`}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center gap-1 text-sm font-medium"
                      >
                        <EyeIcon className="w-5 h-5" /> View
                      </Link>
                    </li>
                  )) : (
                    <li className="p-6 text-center text-slate-500 text-sm">No backups found. Trigger a manual backup to create an archive.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Privacy Tools (GDPR/CCPA) */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Privacy Operations</h2>
              <p className="text-sm text-slate-500 mb-6">Fulfill subject access requests safely.</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                >
                  <div className="flex items-center font-bold text-slate-800 group-hover:text-blue-700">
                    <span className="text-xl mr-3">📥</span> Export User Data
                  </div>
                  <p className="text-xs text-slate-500 mt-1 pl-9">Subject Access Request (SAR)</p>
                </button>
                
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 transition-all group"
                >
                  <div className="flex items-center font-bold text-slate-800 group-hover:text-rose-700">
                    <span className="text-xl mr-3">🗑️</span> Right to be Forgotten
                  </div>
                  <p className="text-xs text-slate-500 mt-1 pl-9">Permanent data erasure</p>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Create Policy Modal */}
      {isCreatePolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCreatePolicyModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Create Retention Policy</h3>
              <button 
                onClick={() => setIsCreatePolicyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePolicy} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Policy Name</label>
                <input 
                  type="text" required
                  value={newPolicy.name}
                  onChange={(e) => setNewPolicy({...newPolicy, name: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  placeholder="e.g., HR Documents"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  required rows={2}
                  value={newPolicy.description}
                  onChange={(e) => setNewPolicy({...newPolicy, description: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white resize-none"
                  placeholder="Briefly describe what this policy covers..."
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Retention (Years)</label>
                  <input 
                    type="number" required min="1" max="99"
                    value={newPolicy.retentionPeriodYears}
                    onChange={(e) => setNewPolicy({...newPolicy, retentionPeriodYears: parseInt(e.target.value)})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Action upon Expiry</label>
                  <select
                    value={newPolicy.action}
                    onChange={(e) => setNewPolicy({...newPolicy, action: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="archive">Archive</option>
                    <option value="delete">Delete Permanently</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6 -mx-6 px-6 -mb-6 pb-6 pt-6 bg-slate-50">
                <button 
                  type="button" 
                  onClick={() => setIsCreatePolicyModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-md shadow-blue-500/20 transition-all text-sm"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Data Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsExportModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <DocumentTextIcon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Export User Data</h3>
              </div>
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleExportDataSubmit} className="p-6 space-y-4 text-left">
              <p className="text-sm text-slate-600 mb-4">
                Initiate a data export for a Subject Access Request (SAR). A secure, encrypted download link containing all associated records will be aggregated and emailed to the Data Protection Officer.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">User Email Address</label>
                <input 
                  type="email" required
                  value={exportEmail}
                  onChange={(e) => setExportEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  placeholder="user@example.com"
                  autoFocus
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6 -mx-6 px-6 -mb-6 pb-6 pt-6 bg-slate-50">
                <button 
                  type="button" 
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-md shadow-blue-500/20 transition-all text-sm flex items-center"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Initiate Export
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Data Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-rose-100 flex justify-between items-center bg-rose-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                  <TrashIcon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Right to be Forgotten</h3>
              </div>
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleDeleteDataSubmit} className="p-6 space-y-4 text-left">
              <div className="bg-rose-50 text-rose-800 p-4 rounded-xl border border-rose-200 text-sm">
                <strong>Warning:</strong> This action is irreversible and will permanently delete all data associated with this user. It will be permanently logged in the audit trail.
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">User Email Address</label>
                <input 
                  type="email" required
                  value={deleteEmail}
                  onChange={(e) => setDeleteEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white"
                  placeholder="user@example.com"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type <span className="font-bold select-all bg-slate-100 px-1 py-0.5 rounded text-rose-600">DELETE</span> to confirm
                </label>
                <input 
                  type="text" required
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white"
                  placeholder="Type DELETE"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6 -mx-6 px-6 -mb-6 pb-6 pt-6 bg-slate-50">
                <button 
                  type="button" 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={deleteConfirmation !== 'DELETE'}
                  className={`px-4 py-2 font-medium rounded-lg shadow-md transition-all text-sm flex items-center ${
                    deleteConfirmation === 'DELETE' 
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Erase Data Permanently
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
