'use client';

import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

// Removed Mock Data in favor of API populated data

export default function AnalyticsPage() {
  const [slaData, setSlaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterDocType, setFilterDocType] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState('Last 30 Days');
  const [filterApprover, setFilterApprover] = useState('All');

  const [showAllAging, setShowAllAging] = useState(false);
  const [showAllForwarders, setShowAllForwarders] = useState(false);

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
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500">Loading Analytics Dashboard...</p>
      </div>
    );
  }

  // Derived Metrics for Header KPI Strip
  const avgApprovalDays = slaData?.averageTurnaroundHours ? (slaData.averageTurnaroundHours / 24).toFixed(1) : '0.0';
  const documentsPending = slaData?.documentsPending || 0;
  const overdueCount = slaData?.overdueCount || 0;
  const momChangeVal = slaData?.momChange || 0;
  const momChange = momChangeVal > 0 ? `+${momChangeVal}%` : `${momChangeVal}%`;
  const isMomPositive = momChangeVal >= 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-100 text-green-800';
      case 'amber': return 'bg-yellow-100 text-yellow-800';
      case 'red': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>

        {/* Filters Bar */}
        <div className="flex flex-wrap gap-3">
          <select className="border rounded-md px-3 py-1.5 text-sm bg-white shadow-sm" value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)}>
            <option>All Departments</option>
            <option>HR</option>
            <option>IT</option>
            <option>Finance</option>
          </select>
          <select className="border rounded-md px-3 py-1.5 text-sm bg-white shadow-sm" value={filterDocType} onChange={e => setFilterDocType(e.target.value)}>
            <option>All Doc Types</option>
            <option>Budget</option>
            <option>Contract</option>
            <option>Policy</option>
          </select>
          <select className="border rounded-md px-3 py-1.5 text-sm bg-white shadow-sm" value={filterDateRange} onChange={e => setFilterDateRange(e.target.value)}>
            <option>Last 30 Days</option>
            <option>Last 90 Days</option>
            <option>This Year</option>
          </select>
          <select className="border rounded-md px-3 py-1.5 text-sm bg-white shadow-sm" value={filterApprover} onChange={e => setFilterApprover(e.target.value)}>
            <option>All Approvers</option>
            <option>John Doe</option>
            <option>Jane Smith</option>
          </select>
        </div>
      </div>

      {/* 1. Header KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Approval Time</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-bold text-gray-900">{avgApprovalDays}</p>
                <p className="text-sm text-gray-500">days</p>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <ClockIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-green-600 mt-4 flex items-center font-medium">
            <ArrowDownIcon className="w-4 h-4 mr-1" />
            15% faster
            <span className="text-gray-400 font-normal ml-2">vs last mo</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Documents Pending</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-bold text-gray-900">{documentsPending}</p>
              </div>
            </div>
            <div className="p-3 bg-indigo-50 rounded-full">
              <DocumentIcon className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <p className="text-sm text-red-600 mt-4 flex items-center font-medium">
            <ArrowUpIcon className="w-4 h-4 mr-1" />
            5% higher
            <span className="text-gray-400 font-normal ml-2">vs last mo</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue Count</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-bold text-gray-900">{overdueCount}</p>
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-green-600 mt-4 flex items-center font-medium">
            <ArrowDownIcon className="w-4 h-4 mr-1" />
            10% lower
            <span className="text-gray-400 font-normal ml-2">vs last mo</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">MoM Change (Vol)</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-bold text-gray-900">{momChange}</p>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-full">
              <ChartBarIcon className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <p className={`text-sm mt-4 flex items-center font-medium ${isMomPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isMomPositive ? <ArrowUpIcon className="w-4 h-4 mr-1" /> : <ArrowDownIcon className="w-4 h-4 mr-1" />}
            {isMomPositive ? 'Active Growth' : 'Decreasing Vol'}
          </p>
        </div>
      </div>

      {/* 2. Document Pipeline (Funnel/Stage View) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-6">Document Pipeline</h2>
        <div className="flex flex-col md:flex-row justify-between items-center relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 hidden md:block"></div>
          {['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'].map((stage, idx) => {
            const counts = [
              slaData?.pipeline?.Draft || 0,
              slaData?.pipeline?.Submitted || 0,
              slaData?.pipeline?.UnderReview || 0,
              slaData?.pipeline?.Approved || 0,
              slaData?.pipeline?.Rejected || 0
            ];
            const isAccumulating = (idx === 1 || idx === 2) && counts[idx] > 10; // visually highlight where volume sits
            return (
              <div key={stage} className="flex flex-col items-center bg-white px-4 mb-4 md:mb-0">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl mb-3 shadow-md
                  ${isAccumulating ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                  {counts[idx]}
                </div>
                <p className="text-sm font-medium text-gray-700">{stage}</p>
                {isAccumulating && <span className="text-xs text-indigo-500 mt-1 font-semibold animate-pulse">High Volume</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 3. Aging Report Table */}
        <div className="bg-white rounded-lg shadow p-6 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Aging Report (In-Flight Documents)</h2>
            {(slaData?.agingReport?.length || 0) > 3 && (
              <button
                onClick={() => setShowAllAging(!showAllAging)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                {showAllAging ? 'Show Less' : 'View All'}
              </button>
            )}
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Wait</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(showAllAging ? (slaData?.agingReport || []) : (slaData?.agingReport || []).slice(0, 3)).map((row: any) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{row.type}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[120px]" title={row.stage}>{row.stage}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-semibold">{row.daysWaiting}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(row.status)}`}>
                        {row.status === 'green' ? 'On Track' : row.status === 'amber' ? 'Approaching SLA' : 'Overdue'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Forwarder Performance Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Forwarder Performance</h2>
            {(slaData?.forwarderPerformance?.length || 0) > 3 && (
              <button
                onClick={() => setShowAllForwarders(!showAllForwarders)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                {showAllForwarders ? 'Show Less' : 'View All'}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forwarder Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Response (h)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Processed/Mo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Queue Size</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(showAllForwarders ? (slaData?.forwarderPerformance || []) : (slaData?.forwarderPerformance || []).slice(0, 3)).map((row: any) => (
                  <tr key={row.id} className={`hover:bg-gray-50 ${row.slowest ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 flex items-center gap-2">
                      {row.name}
                      {row.slowest && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200" title="Slowest average response">
                          Needs Attention
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{row.avgResponse}h</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{row.docsProcessed}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <span className={`font-semibold ${row.queueSize > 10 ? 'text-orange-500' : 'text-gray-700'}`}>
                        {row.queueSize}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. SLA Compliance Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-6">SLA Compliance Trend (Last 12 Weeks)</h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={slaData?.slaTrend || []} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis domain={[60, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(val) => `${val}%`} />
              <RechartsTooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value) => [`${value}%`, 'Compliance']}
              />
              <ReferenceLine y={85} label={{ position: 'top', value: 'Target 85%', fill: '#EF4444', fontSize: 12 }} stroke="#EF4444" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="compliance"
                stroke="#4F46E5"
                strokeWidth={3}
                dot={{ r: 4, fill: '#4F46E5', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
