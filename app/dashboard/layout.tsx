'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  HomeIcon,
  DocumentPlusIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  FolderIcon,
  ArrowRightStartOnRectangleIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { UserRole } from '../../lib/types';
import { AuthUser } from '../../lib/auth';
import NotificationBell from '../../components/NotificationBell';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: UserRole[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: Object.values(UserRole) },
  { name: 'My Requests', href: '/dashboard/requests', icon: ClipboardDocumentListIcon, roles: [UserRole.REQUESTER] },
  { name: 'Create Request', href: '/dashboard/requests/create', icon: DocumentPlusIcon, roles: [UserRole.REQUESTER] },
  { name: 'Queries', href: '/dashboard/queries', icon: ClockIcon, roles: [UserRole.REQUESTER, UserRole.DEAN] },
  { name: 'Documents', href: '/dashboard/documents', icon: FolderIcon, roles: Object.values(UserRole) },
  {
    name: 'Pending Approvals',
    href: '/dashboard/approvals',
    icon: ClipboardDocumentListIcon,
    roles: [UserRole.INSTITUTION_MANAGER, UserRole.SOP_VERIFIER, UserRole.ACCOUNTANT, UserRole.VP, UserRole.HEAD_OF_INSTITUTION, UserRole.DEAN, UserRole.MMA, UserRole.HR, UserRole.AUDIT, UserRole.IT, UserRole.CHIEF_DIRECTOR, UserRole.CHAIRMAN]
  },
  { name: 'Integrations', href: '/dashboard/integrations', icon: LinkIcon, roles: [UserRole.VP, UserRole.HEAD_OF_INSTITUTION, UserRole.DEAN, UserRole.CHIEF_DIRECTOR, UserRole.CHAIRMAN, UserRole.IT] },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon, roles: [UserRole.VP, UserRole.HEAD_OF_INSTITUTION, UserRole.DEAN, UserRole.CHIEF_DIRECTOR, UserRole.CHAIRMAN] },
  { name: 'Compliance', href: '/dashboard/compliance', icon: HomeIcon, roles: [UserRole.AUDIT, UserRole.CHIEF_DIRECTOR, UserRole.CHAIRMAN] },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon, roles: Object.values(UserRole) }
];

const rolesWithDepartments = new Set<UserRole>([
  UserRole.REQUESTER,
]);

const formatLabel = (value?: string | UserRole) => {
  if (!value) return '';
  return value
    .toString()
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [queryCount, setClarificationCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldShowDepartment = !!(user?.department && user?.role && rolesWithDepartments.has(user.role));
  const formattedDepartment = shouldShowDepartment ? formatLabel(user?.department).toUpperCase() : '';
  const formattedRole = user?.role ? formatLabel(user.role).toUpperCase() : '';

  // Function to check if navigation item is active
  const isActiveRoute = (href: string) => {
    const [hrefPath, hrefQuery] = href.split('?');

    const matchesPath = () => {
      if (hrefPath === '/dashboard') {
        return pathname === '/dashboard';
      }

      if (hrefPath === '/dashboard/requests' && !hrefQuery) {
        return pathname === '/dashboard/requests' && !searchParams.get('status');
      }

      if (hrefPath === '/dashboard/requests/create') {
        return pathname === '/dashboard/requests/create';
      }

      return pathname.startsWith(hrefPath);
    };

    if (!matchesPath()) {
      return false;
    }

    if (!hrefQuery) {
      return true;
    }

    const params = new URLSearchParams(hrefQuery);
    for (const [key, value] of params.entries()) {
      if (searchParams.get(key) !== value) {
        return false;
      }
    }

    return true;
  };

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || data); // Handle both wrapped and unwrapped responses
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchClarificationCount = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const response = await fetch('/api/requests', { credentials: 'include' });
      if (!response.ok) return;

      const data = await response.json();

      // Filter for requests that need query from current user
      const queryRequests = data.requests.filter((request: any) =>
        request.pendingQuery && request.queryLevel === user?.role
      );

      setClarificationCount(queryRequests.length);
    } catch (err) {
      console.error('Error fetching query count:', err);
    }
  }, [user]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user && (user.role === 'requester' || user.role === 'dean')) {
      fetchClarificationCount();
      // Set up interval to refresh count every 30 seconds
      const interval = setInterval(fetchClarificationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchClarificationCount]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/');
  };

  const filteredNavigation = navigation.filter(
    item => user && item.roles.includes(user.role)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-gray-50 border-r border-gray-200 pt-5 pb-4">
          {/* Logo/Brand */}
          <div className="px-6 mb-6 flex items-center gap-3">
            
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              S.E.A.D.
            </h1>
          </div>

          {/* Divider Line */}
          <div className="mx-4 mb-6 border-t border-gray-200"></div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1">
            {filteredNavigation.map(item => {
              const isActive = isActiveRoute(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 -ml-1 pl-3'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                >
                  <item.icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  <span className="flex-1">{item.name}</span>
                  {item.name === 'Queries' && queryCount > 0 && (
                    <span className="ml-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {queryCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* HEADER */}
        <div className="flex h-16 bg-white border-b border-gray-100 items-center justify-between px-6 sticky top-0 z-30 shadow-sm">

          {/* LEFT : Branding - Clickable for Logout */}
          <div className="flex items-center gap-3">
            <div className="lg:hidden w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2">
              <span className="text-white text-[10px] font-black">SE</span>
            </div>
            <span className="text-lg font-bold text-slate-800 tracking-tight">
              Enterprise Approval System
            </span>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <NotificationBell />

            <div className="text-right">
              <div className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{user?.name}</span>
              </div>
              <div className="text-xs text-gray-500">
                {user?.role === 'requester' && user?.department
                  ? `${user.department.toUpperCase()} - ${user.role.replace(/_/g, ' ').toUpperCase()}`
                  : user?.role?.replace(/_/g, ' ').toUpperCase()
                }
              </div>
            </div>

            {/* LOGOUT BUTTON – RIGHT CORNER */}
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-md"
              title="Logout"
            >
              <ArrowRightStartOnRectangleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }
    >
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
