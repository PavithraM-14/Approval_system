'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ExclamationTriangleIcon, 
  ClockIcon, 
  UserIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

interface EscalatedRequest {
  _id: string;
  requestId: string;
  title: string;
  status: string;
  requester: {
    _id: string;
    name: string;
    email: string;
    empId: string;
  };
  company: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  daysStuck: number;
  currentApprover?: {
    _id: string;
    name: string;
    email: string;
    empId: string;
  };
  workflowDetails?: {
    currentNodeName: string;
    workflowName: string;
  };
  costEstimate?: number;
  expenseCategory?: string;
}

export default function EscalationsAdminPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<EscalatedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEscalatedRequests();
  }, []);

  const fetchEscalatedRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/escalations');
      
      if (!response.ok) {
        throw new Error('Failed to fetch escalated requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error fetching escalated requests:', err);
      setError('Failed to load escalated requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'submitted': 'bg-blue-100 text-blue-800',
      'manager_review': 'bg-yellow-100 text-yellow-800',
      'budget_check': 'bg-orange-100 text-orange-800',
      'vp_approval': 'bg-purple-100 text-purple-800',
      'hoi_approval': 'bg-indigo-100 text-indigo-800',
      'dean_review': 'bg-pink-100 text-pink-800',
      'chief_director_approval': 'bg-red-100 text-red-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getDaysStuckColor = (days: number) => {
    if (days >= 7) return 'text-red-600 font-bold';
    if (days >= 5) return 'text-orange-600 font-semibold';
    return 'text-yellow-600';
  };

  const handleViewRequest = (requestId: string) => {
    router.push(`/dashboard/requests/${requestId}`);
  };

  const handleSendEmail = async (request: EscalatedRequest) => {
    if (!request.currentApprover) {
      alert('No current approver found for this request');
      return;
    }

    try {
      const response = await fetch('/api/documents/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request._id,
          recipientEmail: request.currentApprover.email,
          recipientName: request.currentApprover.name,
          subject: `Urgent: Request #${request.requestId} Requires Your Attention`,
          message: `This request has been pending for ${request.daysStuck} days and requires your immediate attention.`
        }),
      });

      if (response.ok) {
        alert('Email sent successfully');
      } else {
        throw new Error('Failed to send email');
      }
    } catch (err) {
      console.error('Error sending email:', err);
      alert('Failed to send email');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading escalated requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Escalation Requests</h1>
              <p className="text-gray-600 mt-1">
                Requests pending for more than 3 days ({requests.length} total)
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Escalated Requests</h3>
            <p className="text-gray-600">All requests are being processed within the expected timeframe.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {requests.map((request) => (
                <li key={request._id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            #{request.requestId} - {request.title}
                          </h3>
                          <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {formatStatus(request.status)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`flex items-center ${getDaysStuckColor(request.daysStuck)}`}>
                            <ClockIcon className="h-4 w-4 mr-1" />
                            <span className="text-sm font-medium">{request.daysStuck} days stuck</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <div>
                            <span className="font-medium">Requester:</span>
                            <div>{request.requester.name} ({request.requester.empId})</div>
                            <div className="text-xs text-gray-500">{request.requester.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <BuildingOfficeIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <div>
                            <span className="font-medium">Company:</span>
                            <div>{request.company.name}</div>
                          </div>
                        </div>

                        {request.costEstimate && (
                          <div className="flex items-center">
                            <CurrencyDollarIcon className="h-4 w-4 mr-2 text-gray-400" />
                            <div>
                              <span className="font-medium">Cost:</span>
                              <div>${request.costEstimate.toLocaleString()}</div>
                              {request.expenseCategory && (
                                <div className="text-xs text-gray-500">{request.expenseCategory}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {request.currentApprover && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-md">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-yellow-800">Stuck at:</span>
                              <div className="text-sm text-yellow-700">
                                {request.workflowDetails?.currentNodeName || 'Current Approver'}: {request.currentApprover.name}
                              </div>
                              <div className="text-xs text-yellow-600">
                                {request.currentApprover.email} ({request.currentApprover.empId})
                              </div>
                            </div>
                            <button
                              onClick={() => handleSendEmail(request)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                            >
                              <EnvelopeIcon className="h-3 w-3 mr-1" />
                              Send Reminder
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          Created: {new Date(request.createdAt).toLocaleDateString()} | 
                          Last Updated: {new Date(request.updatedAt).toLocaleDateString()}
                        </div>
                        <button
                          onClick={() => handleViewRequest(request._id)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          View & Take Action
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}