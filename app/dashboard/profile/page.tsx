'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Group {
  _id: string;
  name: string;
  type: string;
  description?: string;
}

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  empId: string;
  contactNo: string;
  college?: string;
  department?: string;
  role: {
    _id: string;
    name: string;
  };
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditingGroups, setIsEditingGroups] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
      fetchUserGroups();
      fetchAllGroups();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const fetchUserGroups = async () => {
    try {
      const response = await fetch(`/api/users/${session?.user?.id}/groups`);
      if (response.ok) {
        const data = await response.json();
        setUserGroups(data.groups || []);
        setSelectedGroupIds(data.groups?.map((g: Group) => g._id) || []);
      }
    } catch (err) {
      console.error('Failed to fetch user groups:', err);
    }
  };

  const fetchAllGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (response.ok) {
        const data = await response.json();
        setAllGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGroups = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/users/${profile._id}/groups`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIds: selectedGroupIds }),
      });

      if (response.ok) {
        setSuccess('Groups updated successfully');
        setIsEditingGroups(false);
        fetchUserGroups();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update groups');
      }
    } catch (err) {
      setError('An error occurred while updating groups');
    } finally {
      setSaving(false);
    }
  };

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const groupsByType = allGroups.reduce((acc, group) => {
    if (!acc[group.type]) {
      acc[group.type] = [];
    }
    acc[group.type].push(group);
    return acc;
  }, {} as Record<string, Group[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-1">Manage your account information and group memberships</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{profile.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Employee ID</label>
              <p className="mt-1 text-sm text-gray-900">{profile.empId}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{profile.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Number</label>
              <p className="mt-1 text-sm text-gray-900">{profile.contactNo}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <p className="mt-1 text-sm text-gray-900">{profile.role.name}</p>
            </div>

            {profile.college && (
              <div>
                <label className="block text-sm font-medium text-gray-700">College</label>
                <p className="mt-1 text-sm text-gray-900">{profile.college}</p>
              </div>
            )}

            {profile.department && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <p className="mt-1 text-sm text-gray-900">{profile.department}</p>
              </div>
            )}
          </div>
        </div>

        {/* Group Memberships */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Group Memberships</h2>
            {!isEditingGroups && (
              <button
                onClick={() => setIsEditingGroups(true)}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Edit Groups
              </button>
            )}
          </div>

          {!isEditingGroups ? (
            <div className="space-y-3">
              {userGroups.length > 0 ? (
                userGroups.map(group => (
                  <div key={group._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{group.name}</p>
                      <p className="text-sm text-gray-500 capitalize">{group.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No group memberships</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupsByType).map(([type, groups]) => (
                <div key={type}>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                    {type.replace('_', ' ')}
                  </h3>
                  <div className="space-y-2">
                    {groups.map(group => (
                      <div key={group._id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`group-${group._id}`}
                          checked={selectedGroupIds.includes(group._id)}
                          onChange={() => handleGroupToggle(group._id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`group-${group._id}`} className="ml-2 text-sm text-gray-700">
                          {group.name}
                          {group.description && (
                            <span className="text-gray-500"> - {group.description}</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  onClick={handleSaveGroups}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingGroups(false);
                    setSelectedGroupIds(userGroups.map(g => g._id));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}