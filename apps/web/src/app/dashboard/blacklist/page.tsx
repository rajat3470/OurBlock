'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';

interface SuspendedBusiness {
  id: string;
  name: string;
  category: string;
  phone: string;
  address: string;
  societyId?: string;
  ownerId?: string;
  status: string;
  suspendedAt?: string;
  suspensionReason?: string;
  recentRejections?: Record<string, string[]>;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: string;
  } | null;
}

type ActiveTab = 'businesses' | 'users' | 'history';

interface SuspendedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  societyId?: string;
}

interface Society {
  id: string;
  name: string;
  city: string;
}

interface BizOption {
  id: string;
  name: string;
  societyId?: string;
  status: string;
}

interface HistoryEntry {
  id: string;
  action: 'suspended' | 'activated';
  entityType: string;
  entityId: string;
  entityName: string;
  ownerId?: string;
  reason: string;
  performedBy: string;
  timestamp?: { _seconds: number };
  _synthesized?: boolean;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function timeAgoFromSeconds(sec: number) {
  return timeAgo(new Date(sec * 1000).toISOString());
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateFromSeconds(sec: number) {
  return formatDate(new Date(sec * 1000).toISOString());
}

export default function BlacklistPage() {
  const [tab, setTab] = useState<ActiveTab>('businesses');

  // Business suspensions
  const [businesses, setBusinesses] = useState<SuspendedBusiness[]>([]);
  const [bizLoading, setBizLoading] = useState(true);
  const [bizError, setBizError] = useState('');
  const [bizActionId, setBizActionId] = useState<string | null>(null);
  const [selectedBiz, setSelectedBiz] = useState<SuspendedBusiness | null>(null);

  // Suspend modal — society → business cascade
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [allBizOptions, setAllBizOptions] = useState<BizOption[]>([]);
  const [suspendSocietyId, setSuspendSocietyId] = useState('');
  const [suspendBizSearch, setSuspendBizSearch] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<BizOption | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendSubmitting, setSuspendSubmitting] = useState(false);

  // User suspensions
  const [users, setUsers] = useState<SuspendedUser[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState('');
  const [userActionId, setUserActionId] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState('');
  const [histFilter, setHistFilter] = useState<'all' | 'suspended' | 'activated'>('all');

  useEffect(() => {
    loadBlacklist();
    loadSuspendedUsers();
    loadReferenceData();
  }, []);

  const loadBlacklist = async () => {
    setBizLoading(true); setBizError('');
    const res = await api.get('/admin/blacklist');
    if (res.success) setBusinesses(res.data || []);
    else setBizError(res.error || 'Failed to load blacklist');
    setBizLoading(false);
  };

  const loadSuspendedUsers = async () => {
    setUserLoading(true); setUserError('');
    const res = await api.get('/users?role=user');
    if (res.success) setUsers((res.data || []).filter((u: SuspendedUser) => u.status === 'suspended'));
    else setUserError(res.error || 'Failed to load users');
    setUserLoading(false);
  };

  const loadReferenceData = async () => {
    const [socRes, bizRes] = await Promise.all([
      api.get('/societies?limit=100'),
      api.get('/businesses?limit=500'),
    ]);
    if (socRes.success) setSocieties(socRes.data || []);
    if (bizRes.success) setAllBizOptions(
      (bizRes.data || []).map((b: any) => ({ id: b.id, name: b.name, societyId: b.societyId, status: b.status }))
    );
  };

  const loadHistory = async () => {
    setHistLoading(true); setHistError('');
    const res = await api.get('/admin/suspension-history?limit=200');
    if (res.success) setHistory(res.data || []);
    else setHistError(res.error || 'Failed to load history');
    setHistLoading(false);
  };

  useEffect(() => {
    if (tab === 'history' && history.length === 0) loadHistory();
  }, [tab]);

  const handleActivateBusiness = async (bizId: string) => {
    if (!confirm('Unblock this business and allow the owner to log in again?')) return;
    setBizActionId(bizId);
    const res = await api.post(`/admin/businesses/${bizId}/blacklist-activate`, {});
    if (res.success) {
      setBusinesses((p) => p.filter((b) => b.id !== bizId));
      if (selectedBiz?.id === bizId) setSelectedBiz(null);
      if (history.length > 0) loadHistory();
    } else {
      alert(res.error || 'Failed to activate business');
    }
    setBizActionId(null);
  };

  const openSuspendModal = () => {
    setSuspendTarget(null);
    setSuspendSocietyId('');
    setSuspendBizSearch('');
    setSuspendReason('');
    setShowSuspendModal(true);
  };

  const handleManualSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendTarget) return;
    setSuspendSubmitting(true);
    const res = await api.post(`/admin/businesses/${suspendTarget.id}/blacklist-suspend`, {
      reason: suspendReason || 'Suspended by admin',
    });
    if (res.success) {
      await loadBlacklist();
      if (history.length > 0) loadHistory();
      setShowSuspendModal(false);
    } else {
      alert(res.error || 'Failed to suspend');
    }
    setSuspendSubmitting(false);
  };

  // Businesses available to suspend (not already suspended)
  const suspendableBizOptions = useMemo(() => {
    let list = allBizOptions.filter((b) => b.status !== 'suspended');
    if (suspendSocietyId) list = list.filter((b) => b.societyId === suspendSocietyId);
    if (suspendBizSearch.trim()) {
      const q = suspendBizSearch.toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [allBizOptions, suspendSocietyId, suspendBizSearch]);

  const filteredHistory = useMemo(() => {
    if (histFilter === 'all') return history;
    return history.filter((h) => h.action === histFilter);
  }, [history, histFilter]);

  const handleActivateUser = async (userId: string) => {
    if (!confirm('Re-activate this user account?')) return;
    setUserActionId(userId);
    const res = await api.post(`/admin/users/${userId}/activate`, {});
    if (res.success) setUsers((p) => p.filter((u) => u.id !== userId));
    else alert(res.error || 'Failed to activate user');
    setUserActionId(null);
  };

  const totalRejections = (biz: SuspendedBusiness) => {
    if (!biz.recentRejections) return 0;
    return Object.values(biz.recentRejections).reduce((sum, arr) => sum + arr.length, 0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🚫 Blacklist Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage suspended accounts and view audit history</p>
        </div>
        <button
          onClick={openSuspendModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          Suspend a Business
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: 'businesses', label: '🏪 Suspended Businesses', count: businesses.length },
          { key: 'users', label: '👤 Suspended Users', count: users.length },
          { key: 'history', label: '📋 History', count: null },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {count !== null && count > 0 && (
              <span className="ml-2 text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Businesses Tab ── */}

      {tab === 'businesses' && (
        bizLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-red-500 border-t-transparent" />
            <p className="text-sm text-gray-500">Loading blacklist…</p>
          </div>
        ) : bizError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-red-700">{bizError}</p>
            <button onClick={loadBlacklist} className="text-sm font-medium text-red-600 underline">Retry</button>
          </div>
        ) : businesses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto text-3xl">✅</div>
            <h3 className="mt-4 text-base font-semibold text-gray-900">No suspended businesses</h3>
            <p className="mt-1 text-sm text-gray-500">All businesses are currently active.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {businesses.map((biz) => (
              <div key={biz.id} className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="flex items-start gap-3 p-5 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-xl shrink-0">
                    🚫
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 leading-tight">{biz.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{biz.category} · {biz.phone}</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
                        SUSPENDED
                      </span>
                    </div>
                    {biz.suspendedAt && (
                      <p className="mt-1 text-xs text-red-500 font-medium">
                        Suspended {timeAgo(biz.suspendedAt)} · {formatDate(biz.suspendedAt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Suspension reason */}
                {biz.suspensionReason && (
                  <div className="mx-5 mb-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide mb-1">Reason</p>
                    <p className="text-sm text-red-800">{biz.suspensionReason}</p>
                  </div>
                )}

                {/* Owner info */}
                {biz.owner ? (
                  <div className="mx-5 mb-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Business Owner</p>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {(biz.owner.firstName?.[0] ?? '') + (biz.owner.lastName?.[0] ?? '')}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{biz.owner.firstName} {biz.owner.lastName}</p>
                        <p className="text-xs text-gray-500">{biz.owner.email}</p>
                      </div>
                      <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        biz.owner.status === 'suspended'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {biz.owner.status}
                      </span>
                    </div>
                  </div>
                ) : biz.ownerId ? (
                  <div className="mx-5 mb-3 text-xs text-gray-400 italic">Owner info unavailable</div>
                ) : (
                  <div className="mx-5 mb-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
                    No owner linked to this business
                  </div>
                )}

                {/* Rejection stats */}
                {biz.recentRejections && Object.keys(biz.recentRejections).length > 0 && (
                  <div className="mx-5 mb-3">
                    <button
                      onClick={() => setSelectedBiz(selectedBiz?.id === biz.id ? null : biz)}
                      className="w-full flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5 text-left transition hover:bg-orange-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">📊</span>
                        <span className="text-xs font-semibold text-orange-800">
                          {totalRejections(biz)} rejection{totalRejections(biz) !== 1 ? 's' : ''} tracked
                          · {Object.keys(biz.recentRejections).length} user{Object.keys(biz.recentRejections).length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <svg className={`w-3.5 h-3.5 text-orange-500 transition-transform ${selectedBiz?.id === biz.id ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {selectedBiz?.id === biz.id && (
                      <div className="mt-1 border border-orange-100 rounded-xl overflow-hidden">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="bg-orange-50 border-b border-orange-100">
                              <th className="px-3 py-2 text-left font-semibold text-orange-700">User ID</th>
                              <th className="px-3 py-2 text-center font-semibold text-orange-700">Rejections</th>
                              <th className="px-3 py-2 text-left font-semibold text-orange-700">Last rejection</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-orange-50 bg-white">
                            {Object.entries(biz.recentRejections).map(([uid, timestamps]) => (
                              <tr key={uid}>
                                <td className="px-3 py-2 font-mono text-gray-600 truncate max-w-[120px]">{uid}</td>
                                <td className="px-3 py-2 text-center font-bold text-red-600">{timestamps.length}</td>
                                <td className="px-3 py-2 text-gray-500">
                                  {timestamps.length > 0 ? timeAgo(timestamps[timestamps.length - 1]) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="px-5 pb-5 flex items-center gap-2">
                  <button
                    onClick={() => handleActivateBusiness(biz.id)}
                    disabled={bizActionId === biz.id}
                    className="flex-1 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    {bizActionId === biz.id ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Activating…</>
                    ) : (
                      <><span>✓</span> Unblock & Reactivate</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Users Tab ── */}
      {tab === 'users' && (
        userLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-red-500 border-t-transparent" />
            <p className="text-sm text-gray-500">Loading suspended users…</p>
          </div>
        ) : userError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-red-700">{userError}</p>
            <button onClick={loadSuspendedUsers} className="text-sm font-medium text-red-600 underline">Retry</button>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto text-3xl">✅</div>
            <h3 className="mt-4 text-base font-semibold text-gray-900">No suspended users</h3>
            <p className="mt-1 text-sm text-gray-500">All users are currently active.</p>
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
                    <th className="px-5 py-3 w-32" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => {
                    const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
                    return (
                      <tr key={user.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {initials || '?'}
                            </div>
                            <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm text-gray-700">{user.email}</p>
                          <p className="text-xs text-gray-400">{user.phone}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            Customer
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
                            suspended
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleActivateUser(user.id)}
                            disabled={userActionId === user.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition"
                          >
                            {userActionId === user.id ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : '✓'}
                            Activate
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── History Tab ── */}
      {tab === 'history' && (
        histLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-indigo-500 border-t-transparent" />
            <p className="text-sm text-gray-500">Loading history…</p>
          </div>
        ) : histError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-red-700">{histError}</p>
            <button onClick={loadHistory} className="text-sm font-medium text-red-600 underline">Retry</button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filters + refresh */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {(['all', 'suspended', 'activated'] as const).map((f) => (
                  <button key={f} onClick={() => setHistFilter(f)}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition capitalize ${
                      histFilter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {f === 'all' ? 'All Events' : f === 'suspended' ? '🚫 Suspensions' : '✅ Activations'}
                  </button>
                ))}
              </div>
              <button onClick={loadHistory} className="ml-auto text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 bg-white transition">
                ↻ Refresh
              </button>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-3xl">📋</div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">No history yet</h3>
                <p className="mt-1 text-sm text-gray-500">Suspension and activation events will appear here.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Event</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Business</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">When</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredHistory.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50 transition">
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                              entry.action === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {entry.action === 'suspended' ? '🚫' : '✅'}
                              {entry.action === 'suspended' ? 'Suspended' : 'Activated'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">{entry.entityName}</p>
                              {entry._synthesized && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 uppercase tracking-wide">legacy</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 font-mono">{entry.entityId}</p>
                          </td>
                          <td className="px-5 py-3.5 max-w-xs">
                            <p className="text-sm text-gray-700 truncate">{entry.reason || '—'}</p>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {entry.timestamp?._seconds ? (
                              <div>
                                <p className="text-xs font-medium text-gray-700">{timeAgoFromSeconds(entry.timestamp._seconds)}</p>
                                <p className="text-[10px] text-gray-400">{formatDateFromSeconds(entry.timestamp._seconds)}</p>
                              </div>
                            ) : <span className="text-xs text-gray-400">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
                  {filteredHistory.length} event{filteredHistory.length !== 1 ? 's' : ''}
                  {histFilter !== 'all' && ` (filtered from ${history.length})`}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ── Manual Suspend Modal ── */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚫</span>
                <h2 className="text-base font-semibold text-gray-900">Suspend a Business</h2>
              </div>
              <button onClick={() => setShowSuspendModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleManualSuspend} className="px-6 py-5 space-y-4">

              {/* Step 1: Filter by society */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Society (optional)</label>
                <select
                  value={suspendSocietyId}
                  onChange={(e) => { setSuspendSocietyId(e.target.value); setSuspendTarget(null); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">All societies</option>
                  {societies.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
                </select>
              </div>

              {/* Step 2: Search + pick business */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Search & Select Business *</label>
                <input
                  type="text"
                  placeholder="Type business name to search…"
                  value={suspendBizSearch}
                  onChange={(e) => { setSuspendBizSearch(e.target.value); setSuspendTarget(null); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400 mb-2"
                />
                {suspendTarget ? (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <span className="text-sm font-semibold text-red-800 flex-1">{suspendTarget.name}</span>
                    <button type="button" onClick={() => { setSuspendTarget(null); setSuspendBizSearch(''); }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium">Change</button>
                  </div>
                ) : suspendableBizOptions.length === 0 ? (
                  <p className="text-xs text-gray-400 px-1">No businesses found. Try different filters.</p>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {suspendableBizOptions.slice(0, 30).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => { setSuspendTarget(b); setSuspendBizSearch(b.name); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-red-50 border-b border-gray-100 last:border-0 transition flex items-center justify-between"
                      >
                        <span className="font-medium">{b.name}</span>
                        <span className="text-xs text-gray-400">
                          {societies.find((s) => s.id === b.societyId)?.name ?? ''}
                        </span>
                      </button>
                    ))}
                    {suspendableBizOptions.length > 30 && (
                      <p className="px-4 py-2 text-xs text-gray-400">+ {suspendableBizOptions.length - 30} more — type to narrow</p>
                    )}
                  </div>
                )}
              </div>

              {/* Step 3: Reason */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason for suspension *</label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Repeated customer complaints, policy violation…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-700">
                ⚠️ The business will be immediately suspended and the owner will be blocked from logging in. If the owner is currently logged in, they will be auto-logged out within 10 seconds.
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowSuspendModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={suspendSubmitting || !suspendTarget}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-2">
                  {suspendSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {suspendSubmitting ? 'Suspending…' : 'Confirm Suspension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
