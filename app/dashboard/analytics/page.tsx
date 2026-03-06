'use client';

import { useState, useEffect } from 'react';
import { ChartBarIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function AnalyticsPage() {
  const [slaData, setSlaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSLAData();
  }, []);

  const fetchSLAData = async () => {
    try {
      const response = await fetch('/api/analytics/sla', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSlaData(data.metrics);
      }
    } catch (error) {
      console.error('Failed to fetch SLA data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const slaCompliance = slaData?.totalRequests > 0 
    ? Math.round((slaData.withinSLA / slaData.totalRequests) * 100) 
    : 0;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">SLA & Performance Analytics</h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ChartBarIcon className="h-12 w-12 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold">{slaData?.totalRequests || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckCircleIcon className="h-12 w-12 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Within SLA</p>
              <p className="text-2xl font-bold">{slaData?.withinSLA || 0}</p>
              <p className="text-xs text-green-600">{slaCompliance}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <XCircleIcon className="h-12 w-12 text-red-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">SLA Breached</p>
              <p className="text-2xl font-bold">{slaData?.breachedSLA || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ClockIcon className="h-12 w-12 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Avg Turnaround</p>
              <p className="text-2xl font-bold">{slaData?.averageTurnaroundHours || 0}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* SLA by Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">SLA Performance by Stage</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Within SLA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Breached</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compliance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {slaData?.byStatus && Object.entries(slaData.byStatus).map(([status, data]: [string, any]) => (
                <tr key={status}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {status.replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.total}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{data.withinSLA}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{data.breached}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.avgTime}h</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${data.slaCompliance >= 80 ? 'bg-green-600' : data.slaCompliance >= 60 ? 'bg-yellow-600' : 'bg-red-600'}`}
                          style={{ width: `${data.slaCompliance}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{data.slaCompliance}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breached Requests */}
      {slaData?.breachedRequests && slaData.breachedRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent SLA Breaches</h2>
          <div className="space-y-3">
            {slaData.breachedRequests.slice(0, 10).map((breach: any, index: number) => (
              <div key={index} className="border-l-4 border-red-600 pl-4 py-2 bg-red-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">Request #{breach.requestId}</p>
                    <p className="text-sm text-gray-600">{breach.title}</p>
                    <p className="text-xs text-gray-500">{breach.status.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-600 font-medium">+{breach.breach}h over SLA</p>
                    <p className="text-xs text-gray-500">Took {breach.timeSpent}h (Target: {breach.slaTarget}h)</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
