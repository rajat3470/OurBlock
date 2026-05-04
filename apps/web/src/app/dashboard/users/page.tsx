'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  societyId?: string;
  isEmailVerified?: boolean;
}

const ROLES = ['user', 'businessOwner', 'superAdmin'];

const roleMeta: Record<string, { label: string; cls: string }> = {
  superAdmin:    { label: 'Super Admin',    cls: 'bg-purple-100 text-purple-700' },
  businessOwner: { label: 'Business Owner', cls: 'bg-amber-100 text-amber-700' },
  user:          { label: 'Customer',       cls: 'bg-emerald-100 text-emerald-700' },
};

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterRole, setFilterRole] = useState('');

  useEffect(() => { loadUsers(); }, [filterRole]);

  const loadUsers = async () => {
    setLoading(true); setError('');
    const endpoint = filterRole ? `/users?role=${filterRole}` : '/users';
    const res = await api.get(endpoint);
    if (res.success) setUsers(res.data || []);
    else setError(res.error || 'Failed to load users');
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    const res = await api.delete(`/users/${id}`);
    if (res.success) setUsers((p) => p.filter((u) => u.id !== id));
    else alert(res.error || 'Failed to delete user');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} user{users.length !== 1 ? 's' : ''} found</p>
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="field w-auto text-gray-900 bg-white"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{roleMeta[r]?.label ?? r}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading users…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={loadUsers} className="text-sm font-medium text-red-600 underline">Retry</button>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-3xl">👥</div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filterRole ? `No users with role "${filterRole}".` : 'Users will appear here once they register.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => {
                  const meta = roleMeta[user.role];
                  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {initials || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                            {user.isEmailVerified && (
                              <p className="text-[10px] text-emerald-600 font-medium">✓ Email verified</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-gray-700">{user.email}</p>
                        <p className="text-xs text-gray-400">{user.phone}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${meta?.cls ?? 'bg-gray-100 text-gray-600'}`}>
                          {meta?.label ?? user.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                          user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button onClick={() => handleDelete(user.id)}
                          className="text-xs font-medium text-red-500 hover:text-red-700 transition">
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
