'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Stats {
  totalSocieties: number;
  totalBusinesses: number;
  pendingVerifications: number;
  totalUsers: number;
  totalOrders: number;
}

interface RecentItem {
  id: string;
  name: string;
  createdAt?: any;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentSocieties, setRecentSocieties] = useState<RecentItem[]>([]);
  const [recentBusinesses, setRecentBusinesses] = useState<RecentItem[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    const [statsRes, societiesRes, businessesRes, usersRes] = await Promise.all([
      api.get<Stats>('/admin/stats'),
      api.get<RecentItem[]>('/admin/societies?limit=5'),
      api.get<RecentItem[]>('/admin/businesses?limit=5'),
      api.get<RecentItem[]>('/admin/users?limit=5'),
    ]);

    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    else setError(statsRes.error || 'Failed to load analytics');

    if (societiesRes.success) setRecentSocieties(societiesRes.data || []);
    if (businessesRes.success) setRecentBusinesses(businessesRes.data || []);
    if (usersRes.success) setRecentUsers(usersRes.data || []);

    setLoading(false);
  };

  const formatDate = (value: any) => {
    if (!value) return '—';
    const date = value.seconds ? new Date(value.seconds * 1000) : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform metrics and recent activity</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading analytics…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={loadAnalytics} className="text-sm font-medium text-red-600 underline">Retry</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard label="Active Societies" value={stats?.totalSocieties ?? 0} icon="🏘️" color="bg-blue-500" />
            <StatCard label="Total Businesses" value={stats?.totalBusinesses ?? 0} icon="🏪" color="bg-emerald-500" />
            <StatCard label="Pending Verifications" value={stats?.pendingVerifications ?? 0} icon="⏳" color="bg-amber-500" />
            <StatCard label="Registered Users" value={stats?.totalUsers ?? 0} icon="👥" color="bg-purple-500" />
            <StatCard label="Total Orders" value={stats?.totalOrders ?? 0} icon="📦" color="bg-rose-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RecentList title="Recent Societies" items={recentSocieties} formatDate={formatDate} />
            <RecentList title="Recent Businesses" items={recentBusinesses} formatDate={formatDate} />
            <RecentList title="Recent Users" items={recentUsers} formatDate={formatDate} />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</p>
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-2xl text-white shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function RecentList({ title, items, formatDate }: { title: string; items: RecentItem[]; formatDate: (v: any) => string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No data yet</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm font-medium text-gray-900 truncate pr-4">{item.name}</span>
              <span className="text-xs text-gray-400 shrink-0">{formatDate(item.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
