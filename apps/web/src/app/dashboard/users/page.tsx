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

interface Society {
  id: string;
  name: string;
  city: string;
}

interface OwnerForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  societyId: string;
}

interface OwnerResult {
  email: string;
  temporaryPassword: string;
}

const ROLES = ['user', 'businessOwner', 'superAdmin'];

const roleMeta: Record<string, { label: string; cls: string }> = {
  superAdmin:    { label: 'Super Admin',    cls: 'bg-purple-100 text-purple-700' },
  businessOwner: { label: 'Business Owner', cls: 'bg-amber-100 text-amber-700' },
  user:          { label: 'Customer',       cls: 'bg-emerald-100 text-emerald-700' },
};

const emptyOwnerForm: OwnerForm = { firstName: '', lastName: '', email: '', phone: '', societyId: '' };

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterRole, setFilterRole] = useState('');

  // Create business owner
  const [societies, setSocieties] = useState<Society[]>([]);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerForm, setOwnerForm] = useState<OwnerForm>(emptyOwnerForm);
  const [ownerFormError, setOwnerFormError] = useState('');
  const [ownerSubmitting, setOwnerSubmitting] = useState(false);
  const [ownerResult, setOwnerResult] = useState<OwnerResult | null>(null);
  const [copied, setCopied] = useState<'email' | 'password' | null>(null);

  useEffect(() => { loadUsers(); }, [filterRole]);

  useEffect(() => {
    api.get('/societies?limit=100').then((res) => {
      if (res.success) setSocieties(res.data || []);
    });
  }, []);

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

  const openOwnerModal = () => {
    setOwnerForm(emptyOwnerForm);
    setOwnerFormError('');
    setOwnerResult(null);
    setCopied(null);
    setShowOwnerModal(true);
  };

  const closeOwnerModal = () => { setShowOwnerModal(false); setOwnerResult(null); };

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerFormError('');
    if (!ownerForm.societyId) { setOwnerFormError('Please select a society'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerForm.email)) { setOwnerFormError('Enter a valid email address'); return; }
    if (!/^[6-9]\d{9}$/.test(ownerForm.phone)) { setOwnerFormError('Enter a valid 10-digit Indian mobile number'); return; }
    setOwnerSubmitting(true);
    const res = await api.post('/admin/business-owners', ownerForm);
    if (res.success) {
      setOwnerResult({ email: res.data.email, temporaryPassword: res.data.temporaryPassword });
      loadUsers();
    } else {
      setOwnerFormError(res.error || 'Failed to create account');
    }
    setOwnerSubmitting(false);
  };

  const copyToClipboard = (text: string, field: 'email' | 'password') => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} user{users.length !== 1 ? 's' : ''} found</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          className="field w-auto text-gray-900 bg-white"
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{roleMeta[r]?.label ?? r}</option>)}
          </select>
          <button onClick={openOwnerModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Owner
          </button>
        </div>
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

      {/* Create Business Owner Modal */}
      {showOwnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Create Business Owner</h2>
              <button onClick={closeOwnerModal} className="text-gray-400 hover:text-gray-600 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {ownerResult ? (
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm font-medium text-green-800">Account created successfully!</p>
                </div>
                <p className="text-xs text-gray-500">Share these credentials securely. The owner will be prompted to change their password on first login.</p>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Email</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 font-mono break-all">{ownerResult.email}</p>
                      <button onClick={() => copyToClipboard(ownerResult.email, 'email')}
                        className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition">
                        {copied === 'email' ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Temporary Password</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-lg font-bold text-gray-900 font-mono tracking-widest">{ownerResult.temporaryPassword}</p>
                      <button onClick={() => copyToClipboard(ownerResult.temporaryPassword, 'password')}
                        className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition">
                        {copied === 'password' ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button onClick={closeOwnerModal}
                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateOwner} className="px-6 py-5 space-y-4">
                {ownerFormError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{ownerFormError}</div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Society *</label>
                  <select value={ownerForm.societyId} onChange={(e) => setOwnerForm((p) => ({ ...p, societyId: e.target.value }))} required
                    className="field">
                    <option value="">Select a society…</option>
                    {societies.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} — {s.city}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                    <input value={ownerForm.firstName} onChange={(e) => setOwnerForm((p) => ({ ...p, firstName: e.target.value }))} required
                      placeholder="Raj" className="field" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                    <input value={ownerForm.lastName} onChange={(e) => setOwnerForm((p) => ({ ...p, lastName: e.target.value }))} required
                      placeholder="Sharma" className="field" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
                  <input type="email" value={ownerForm.email} onChange={(e) => setOwnerForm((p) => ({ ...p, email: e.target.value }))} required
                    placeholder="owner@business.com" className="field" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number *</label>
                  <input type="tel" value={ownerForm.phone} onChange={(e) => setOwnerForm((p) => ({ ...p, phone: e.target.value }))} required
                    placeholder="10-digit mobile number" maxLength={10} className="field" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={closeOwnerModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={ownerSubmitting}
                    className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
                    {ownerSubmitting ? 'Creating…' : 'Generate Credentials'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
