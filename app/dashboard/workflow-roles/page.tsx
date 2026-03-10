'use client';

import React, { useState, useEffect } from 'react';
import RoleManagement from '@/components/RoleManagement';

/**
 * Workflow Roles Page
 * 
 * Displays and manages custom workflow roles for the company.
 * This page hosts the RoleManagement component which shows all roles
 * with usage indicators.
 * 
 * Requirements:
 * - 1.5: Allow System Admin to view all roles defined for their company
 */
export default function WorkflowRolesPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user || data);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const companyId = user?.companyId;

  if (!companyId) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">
            Error: No company associated with your account
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <RoleManagement companyId={companyId} />
    </div>
  );
}
