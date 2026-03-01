'use client';

import { ClipboardDocumentListIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import QueryIndicator from '../../components/QueryIndicator';
import RequestSearch from '../../components/RequestSearch';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => res.json());

interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  inProgressRequests: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { data: stats, error } = useSWR<DashboardStats>('/api/dashboard/stats', fetcher);
  // Show a single, unified recent list for all roles
  const { data: recentRequests, isLoading: isLoadingRequests, mutate: mutateRecentRequests } = useSWR('/api/requests?limit=5', fetcher);

  const [searchActive, setSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // For Search component
  const { data: allRequestsData } = useSWR('/api/requests', fetcher);
  const allRequests = allRequestsData?.requests || [];
  const colleges = [...new Set(allRequests.map((r: any) => r.college))].filter(Boolean) as string[];
  const departments = [...new Set(allRequests.map((r: any) => r.department))].filter(Boolean) as string[];
  const expenseCategories = [...new Set(allRequests.map((r: any) => r.expenseCategory))].filter(Boolean) as string[];

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!stats) return;
    mutateRecentRequests();
  }, [stats, mutateRecentRequests]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  const handleSearch = async (filters: any) => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value as string);
      });

      const response = await fetch(`/api/requests/search?${params.toString()}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.requests);
        setSearchActive(true);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchActive(false);
    setSearchResults([]);
  };

  const handleStatsCardClick = (cardName: string) => {
    // Route based on user role
    const isRequester = currentUser?.role === 'requester';

    console.log('[DEBUG] Stats card clicked:', {
      cardName,
      userRole: currentUser?.role,
      isRequester
    });

    switch (cardName) {
      case 'Total Requests':
        if (isRequester) {
          router.push('/dashboard/requests');
        } else {
          router.push('/dashboard/approvals?status=all');
        }
        break;

      case 'Pending':
        if (isRequester) {
          router.push('/dashboard/requests?status=pending');
        } else {
          router.push('/dashboard/approvals?status=pending');
        }
        break;

      case 'Approved':
        if (isRequester) {
          router.push('/dashboard/requests?status=approved');
        } else {
          router.push('/dashboard/approvals?status=approved');
        }
        break;

      case 'Rejected':
        if (isRequester) {
          router.push('/dashboard/requests?status=rejected');
        } else {
          router.push('/dashboard/approvals?status=rejected');
        }
        break;

      case 'In Progress':
      case 'My Involvement':
        router.push('/dashboard/in-progress');
        break;

      default:
        if (isRequester) {
          router.push('/dashboard/requests');
        } else {
          router.push('/dashboard/approvals');
        }
    }
  };

  // Create stats cards based on user role
  const baseStatsCards = [
    {
      name: 'Total Requests',
      stat: stats?.totalRequests || 0,
      icon: ClipboardDocumentListIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: currentUser?.role === 'requester' ? 'View all my requests' : 'View all requests forwarded to you',
    },
    {
      name: 'Pending',
      stat: stats?.pendingRequests || 0,
      icon: ClockIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: currentUser?.role === 'requester' ? 'View my pending requests' : 'View pending approvals',
    },
    {
      name: 'Approved',
      stat: stats?.approvedRequests || 0,
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: currentUser?.role === 'requester' ? 'View my fully approved requests' : 'View requests you have approved',
    },
    {
      name: 'Rejected',
      stat: stats?.rejectedRequests || 0,
      icon: ExclamationTriangleIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: currentUser?.role === 'requester' ? 'View my rejected requests' : 'View requests you approved but were later rejected',
    },
  ];

  // Add "In Progress" card for non-requesters
  const statsCards = currentUser?.role === 'requester'
    ? baseStatsCards
    : [
      ...baseStatsCards.slice(0, 2), // Total and Pending
      ...baseStatsCards.slice(2) // Approved and Rejected
    ];

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">Error loading dashboard data</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* PAGE HEADER */}
      <div className="mb-6 sm:mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Dashboard</h2>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statsCards.map((item) => (
          <div
            key={item.name}
            className="group bg-white/80 backdrop-blur-md shadow-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 transition transform hover:scale-[1.02] hover:shadow-xl cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 active:scale-[0.98]"
            onClick={() => handleStatsCardClick(item.name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleStatsCardClick(item.name);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`${item.description} - ${item.stat} requests`}
          >
            <div className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-lg sm:rounded-xl ${item.bgColor} group-hover:scale-110 transition-transform`}>
              <item.icon className={`w-6 h-6 sm:w-8 sm:h-8 ${item.color}`} />
            </div>

            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600 font-medium group-hover:text-gray-800 transition-colors">{item.name}</p>

            <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 mt-1 sm:mt-2 group-hover:scale-105 transition">
              {item.stat}
            </p>

            <p className="text-xs text-gray-500 mt-2 group-hover:text-gray-600 transition-colors">
              {item.description}
            </p>

            {/* Click indicator */}
            <div className="mt-3 flex items-center text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
              <span>Click to view</span>
              <svg className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH SECTION */}
      <div className="mt-8 sm:mt-12">
        <div className="flex items-center gap-2 mb-4">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-900">Advanced Search</h3>
        </div>
        <RequestSearch
          onSearch={handleSearch}
          onClear={handleClearSearch}
          colleges={colleges}
          departments={departments}
          expenseCategories={expenseCategories}
        />
      </div>

      {/* SEARCH RESULTS OR RECENT REQUESTS */}
      <div className="mt-8 sm:mt-10 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
            {searchActive ? 'Search Results' : 'Recent Requests'}
          </h3>
          {(searchActive ? searchResults : recentRequests?.requests)?.length > 0 && (
            <p className="text-xs sm:text-sm text-gray-500">Click on any request to view details</p>
          )}
        </div>

        {searchActive && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between animate-fadeIn">
            <span className="text-sm text-blue-700 font-medium">
              Found {searchResults.length} results matching your search criteria
            </span>
            <button
              onClick={handleClearSearch}
              className="text-sm text-blue-600 hover:text-blue-800 font-bold px-3 py-1 rounded-md hover:bg-blue-100 transition-colors"
            >
              Back to Recent
            </button>
          </div>
        )}

        {searchLoading || isLoadingRequests ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (searchActive ? searchResults : recentRequests?.requests)?.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {(searchActive ? searchResults : recentRequests.requests)
              .filter((request: any) => request && request._id)
              .map((request: any) => (
                <li
                  key={request._id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 hover:scale-[1.005] transition-all cursor-pointer rounded-xl px-4 -mx-4 focus-within:ring-2 focus-within:ring-blue-500 active:scale-[0.99] gap-3"
                  onClick={() => router.push(`/dashboard/requests/${request._id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-blue-600 hover:text-blue-700 transition-colors truncate">
                      {request.title || 'Untitled Request'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1 items-center">
                      <span className="text-sm font-medium text-gray-900">{request.college || 'Unknown'}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-sm text-gray-600">{request.department || 'Unknown'}</span>
                    </div>
                    <p className="text-xs text-gray-400 font-medium mt-1">
                      {request.costEstimate > 0 ? `₹${request.costEstimate?.toLocaleString()} • ` : ''}
                      {request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown date'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSearch({ status: request.status });
                        }}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${getStatusClass(request.status || 'unknown')} whitespace-nowrap hover:scale-110 transition-transform active:scale-95`}
                        title={`Filter by ${request.status?.replace('_', ' ')}`}
                      >
                        {request.status
                          ? (request.status === 'parallel_verification'
                            ? 'VERIFICATION'
                            : request.status.replace('_', ' ').toUpperCase())
                          : 'UNKNOWN'}
                      </button>
                      {request.pendingQuery && request.queryLevel === currentUser?.role && (
                        <QueryIndicator size="sm" showText={false} />
                      )}
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-300 flex-shrink-0 group-hover:text-blue-500 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </li>
              ))}
          </ul>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              {searchActive ? 'No results match your search criteria' : 'No recent requests found.'}
            </p>
            {searchActive && (
              <button
                onClick={handleClearSearch}
                className="mt-4 text-blue-600 font-bold hover:underline"
              >
                Clear search and view recent
              </button>
            )}
          </div>
        )}

        {/* View All Requests Link */}
        {recentRequests?.requests?.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                const targetPath = currentUser?.role === 'requester' ? '/dashboard/requests' : '/dashboard/approvals?status=all';
                router.push(targetPath);
              }}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              View All →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* STATUS COLORS */
function getStatusClass(status: string | undefined | null) {
  if (!status) return 'bg-gray-100 text-gray-700';

  switch (status.toLowerCase()) {
    case 'approved':
      return 'bg-green-100 text-green-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    case 'draft':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-yellow-100 text-yellow-700';
  }
}