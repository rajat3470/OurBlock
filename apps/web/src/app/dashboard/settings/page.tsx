'use client';

import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/api';
import api from '@/lib/api';

export default function SettingsPage() {
  const [user, setUser] = useState<{ email: string | null; id: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    if (u) setUser({ email: u.email, id: u.id });
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setPwLoading(true);
    try {
      const res = await api.post('/auth/change-password', { newPassword });
      if (res.success) {
        setPwSuccess('Password updated successfully');
        setNewPassword(''); setConfirmPassword('');
      } else {
        setPwError(res.error || 'Failed to update password');
      }
    } catch (err: any) {
      setPwError(err?.message ?? 'Failed to update password');
    }
    setPwLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and security preferences</p>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Account Information</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email Address</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono">
                {user?.email || '—'}
              </div>
              <span className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">Super Admin</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">User ID</label>
            <p className="text-xs text-gray-400 font-mono break-all bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">{user?.id || '—'}</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Change Password</h2>
          <p className="text-xs text-gray-500 mt-0.5">Update your admin account password</p>
        </div>
        <form onSubmit={handleChangePassword} className="px-6 py-5 space-y-4">
          {pwError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">{pwError}</div>
          )}
          {pwSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-sm text-emerald-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {pwSuccess}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Min. 6 characters"
                className="field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repeat new password"
                className="field"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={pwLoading}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* API Info */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">API Configuration</h2>
        </div>
        <div className="px-6 py-5">
          <label className="block text-xs font-medium text-gray-500 mb-1">Base URL</label>
          <p className="text-xs text-gray-500 font-mono break-all bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            {process.env.NEXT_PUBLIC_API_BASE_URL || '—'}
          </p>
        </div>
      </div>
    </div>
  );
}


