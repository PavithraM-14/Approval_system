'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Request {
  _id: string;
  requestId?: string;
  title: string;
  purpose: string;
  college: string;
  department: string;
  costEstimate: number;
  expenseCategory: string;
  status: string;
  createdAt: string;
  requester: {
    name: string;
    email: string;
  };
  _visibility?: {
    category: string;
    reason: string;
    userAction?: string;
  };
}

export default function InProgressPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const userData = data.user || data; // Handle both wrapped and unwrapped responses
        setCurrentUser(userData);
        
        // Redirect requesters to their requests page (Admins can access both)
        if (userData.role.permissions.canCreate && !userData.role.isSystemAdmin) {
          router.push('/dashboard/requests');
          return;
        }
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  }, [router]);

  const fetchInProgressRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/in-progress', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch in-progress requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error fetching in-progress requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load in-progress requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchInProgressRequests();
  }, [fetchCurrentUser, fetchInProgressRequests]);

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'submitted':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getStatusDisplayName = (status: string) => {
    const statusMap: Record<string, string> = {
      'submitted': 'In Progress',
      'approved': 'Fully Approved',
      'rejected': 'Rejected'
    };
    
    return statusMap[status.toLowerCase()] || 'In Progress';
  };

  const getCurrentStageDescription = (status: string) => {
    const stageMap: Record<string, string> = {
      'submitted': 'Request is being processed through the approval workflow',
      'approved': 'Request has been fully approved',
      'rejected': 'Request has been rejected'
    };
    
    return stageMap[status.toLowerCase()] || 'Processing through workflow...';
  };

  const getUserActionBadge = (userAction?: string) => {
    switch (userAction) {
      case 'approve':
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium whitespace-nowrap">
            ✓ You Approved
          </span>
        );
      case 'clarify':
        return (
          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium whitespace-nowrap">
            ❓ You Clarified
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium whitespace-nowrap">
            👁️ Involved
          </span>
        );
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show access denied for requesters (Admins can bypass)
  if (currentUser.role.permissions.canCreate && !currentUser.role.isSystemAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-blue-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-blue-800 mb-2">Access Restricted</h3>
          <p className="text-blue-700 mb-4">This page is only accessible to approvers. You can view your requests on the requests page.</p>
          <button
            onClick={() => router.push('/dashboard/requests')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to My Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
            My Involvement History
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Requests you have approved - both in progress and completed
          </p>
          {currentUser && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Role: <span className="font-medium">{currentUser.role.name.toUpperCase()}</span>
            </p>
          )}
        </div>

        <div className="flex gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={fetchInProgressRequests}
            className="px-3 sm:px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 shadow-sm transition text-sm sm:text-base active:scale-95"
          >
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">↻</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 sm:mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* No In Progress Requests */}
      {requests.length === 0 ? (
        <div className="text-center py-12 sm:py-16 bg-white rounded-xl sm:rounded-2xl shadow-md border border-gray-100">
          <svg
            className="mx-auto h-12 w-12 sm:h-14 sm:w-14 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <h3 className="mt-4 text-base sm:text-lg font-semibold text-gray-900">
            No involvement history
          </h3>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            You haven&apos;t approved any requests yet.
          </p>
        </div>
      ) : (
        /* In Progress Requests List */
        <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-100">
          {/* Results Summary */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600">
              {requests.length} request{requests.length !== 1 ? 's' : ''} you&apos;ve been involved in approving
            </p>
          </div>

          <ul className="divide-y divide-gray-200">
            {requests.map((request) => (
              <li key={request._id}>
                <div
                  className="hover:bg-gray-50 hover:scale-[1.01] transition cursor-pointer rounded-xl p-3 sm:p-4 active:scale-[0.99]"
                  onClick={() => router.push(`/dashboard/requests/${request._id}`)}
                >
                  <div className="flex flex-col gap-3">
                    {/* Header with title and user action */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-blue-700 truncate">
                          {request.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Requested by: <span className="font-medium">{request.requester.name}</span>
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                          {request.college} • {request.department}
                        </p>
                      </div>

                      <div className="flex gap-2 items-center flex-shrink-0">
                        {/* User's action badge */}
                        {getUserActionBadge(request._visibility?.userAction)}
                        
                        {request.costEstimate > 0 && (
                          <span className="px-2 sm:px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold whitespace-nowrap">
                            ₹{request.costEstimate.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Current Stage - Prominent Display */}
                    <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500">
                      <div className="flex flex-col gap-3">
                        {/* Stage Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs sm:text-sm font-medium text-gray-700">Current Stage:</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusBadgeClass(request.status)}`}>
                              {getStatusDisplayName(request.status)}
                            </span>
                            <span className="text-xs text-gray-600 italic">
                              {getCurrentStageDescription(request.status)}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(request.status)}`}>
                            {getStatusDisplayName(request.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Meta info */}
                  <p className="text-xs sm:text-sm text-gray-600 mt-2 line-clamp-2">
                    {request.purpose.substring(0, 120)}
                    {request.purpose.length > 120 && '...'}
                  </p>

                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      Created: {new Date(request.createdAt).toLocaleDateString('en-GB')}
                    </span>
                    <span className="text-xs text-blue-600 font-medium">
                      Click to view details →
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}