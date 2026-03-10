'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeftIcon, UserIcon } from '@heroicons/react/24/outline';

interface User {
  _id: string;
  name: string;
  email: string;
  empId: string;
  department?: string;
  contactNo: string;
  isActive: boolean;
}

interface Role {
  _id: string;
  name: string;
  description: string;
  isSystemAdmin: boolean;
}

export default function RoleDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const roleId = params.id as string;

  const [role, setRole] = useState<Role | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoleAndUsers();
  }, [roleId]);

  const fetchRoleAndUsers = async () => {
    try {
      // Fetch role details
      const roleResponse = await fetch(`/api/roles/${roleId}`, { credentials: 'include' });
      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        setRole(roleData);
      }

      // Fetch users with this role
      const usersResponse = await fetch(`/api/roles/${roleId}/users`, { credentials: 'include' });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching role details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Role not found</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/roles')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Back to Roles
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{role.name}</h2>
            <p className="text-gray-600 mt-1">{role.description}</p>
            {role.isSystemAdmin && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-2">
                System Admin
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{users.length}</div>
            <div className="text-sm text-gray-500">Total Users</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Users with this Role</h3>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-12">
            <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No users assigned to this role yet</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{user.empId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{user.department || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{user.contactNo}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
