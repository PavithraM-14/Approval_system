'use client';

import { useState, useEffect } from 'react';
import { ShieldCheckIcon, DocumentTextIcon, ClockIcon, ExclamationTriangleIcon, TrashIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';

export default function CompliancePage() {
  const [stats, setStats] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      const [statsRes, policiesRes] = await Promise.all([
        fetch('/api/compliance/stats', { credentials: 'include' }),
        fetch('/api/retention/policies', { credentials: 'include' })
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
        setExpiringDocs(data.expiringDocuments || []);
      }

      if (policiesRes.ok) {
        const data = await policiesRes.json();
        setPolicies(data.policies || []);
      }
    } catch (error) {
      console.error('Failed to fetch compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPolicies = async () => {
    if (!confirm('Apply retention policies now? This will archive/delete documents based on configured rules.')) {
      return;
    }

    try {
      const response = await fetch('/api/retention/apply', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Retention policies applied:\n- Archived: ${data.results.archived}\n- Deleted: ${data.results.deleted}\n- Flagged for review: ${data.results.flaggedForReview}`);
        fetchComplianceData();
      } else {
        alert('Failed to apply retention policies');
      }
    } catch (error) {
      console.error('Failed to apply policies:', error);
      alert('Error applying retention policies');
    }
  };

  const handleExportData = async () => {
    const email = prompt('Enter user email to export data:');
    if (!email) return;

    try {
      const response = await fetch('/api/compliance/export-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-data-${email}-${Date.now()}.json`;
        a.click();
      } else {
        alert('Failed to export data');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Error exporting data');
    }
  };

  const handleDeleteData = async () => {
    const email = prompt('Enter user email to delete data (IRREVERSIBLE):');
    if (!email) return;

    if (!confirm(`Are you ABSOLUTELY SURE you want to permanently delete all data for ${email}? This cannot be undone!`)) {
      return;
    }

    try {
      const response = await fetch('/api/compliance/delete-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include'
      });

      if (response.ok) {
        alert('User data deleted successfully');
      } else {
        const data = await response.json();
        alert(`Failed to delete data: ${data.error}`);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Error deleting data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Compliance & Governance</h1>
        <button
          onClick={handleApplyPolicies}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Apply Retention Policies Now
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-12 w-12 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Compliant Documents</p>
              <p className="text-2xl font-bold">{stats?.compliant || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold">{stats?.expiringSoon || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ClockIcon className="h-12 w-12 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Pending Reviews</p>
              <p className="text-2xl font-bold">{stats?.pendingReviews || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <DocumentTextIcon className="h-12 w-12 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Audit Logs (30d)</p>
              <p className="text-2xl font-bold">{stats?.auditLogs || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Retention Policies */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Active Retention Policies</h2>
        <div className="space-y-4">
          {policies.length > 0 ? (
            policies.map((policy, index) => (
              <div key={index} className="border-l-4 border-blue-600 pl-4 py-2 bg-gray-50 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{policy.name}</h3>
                    <p className="text-sm text-gray-600">{policy.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Retention: {policy.retentionPeriodYears} years | Action: {policy.action}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    policy.action === 'archive' ? 'bg-blue-100 text-blue-800' :
                    policy.action === 'delete' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {policy.action === 'archive' && <ArchiveBoxIcon className="h-4 w-4 inline mr-1" />}
                    {policy.action === 'delete' && <TrashIcon className="h-4 w-4 inline mr-1" />}
                    {policy.action.toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No retention policies configured</p>
          )}
        </div>
      </div>

      {/* Expiring Documents */}
      {expiringDocs.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Documents Expiring Soon (Next 30 Days)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Until Expiry</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expiringDocs.slice(0, 10).map((doc, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doc.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.documentType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{doc.daysUntilExpiry} days</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GDPR Compliance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">GDPR Compliance Tools</h2>
        <p className="text-sm text-gray-600 mb-4">
          Manage user data in compliance with GDPR regulations (Right to Access, Right to be Forgotten)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleExportData}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition text-left"
          >
            <h3 className="font-medium mb-2">📥 Export User Data</h3>
            <p className="text-sm text-gray-600">Generate complete data export for user requests (GDPR Article 15)</p>
          </button>
          <button
            onClick={handleDeleteData}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-red-600 transition text-left"
          >
            <h3 className="font-medium mb-2 text-red-600">🗑️ Delete User Data</h3>
            <p className="text-sm text-gray-600">Permanently remove user data - Right to be Forgotten (GDPR Article 17)</p>
          </button>
        </div>
      </div>
    </div>
  );
}
