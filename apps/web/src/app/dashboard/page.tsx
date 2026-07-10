'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Stats {
  totalSocieties: number;
  totalBusinesses: number;
  pendingVerifications: number;
  totalUsers: number;
  totalOrders: number;
}

const statCards: { key: keyof Stats; label: string; icon: string; href: string; color: string }[] = [
  { key: 'totalSocieties', label: 'Active Societies', icon: '🏘️', href: '/dashboard/societies', color: 'bg-blue-500' },
  { key: 'totalBusinesses', label: 'Total Businesses', icon: '🏪', href: '/dashboard/businesses', color: 'bg-emerald-500' },
  { key: 'pendingVerifications', label: 'Pending Verifications', icon: '⏳', href: '/dashboard/businesses', color: 'bg-amber-500' },
  { key: 'totalUsers', label: 'Registered Users', icon: '👥', href: '/dashboard/users', color: 'bg-purple-500' },
  { key: 'totalOrders', label: 'Total Orders', icon: '📦', href: '/dashboard/orders', color: 'bg-rose-500' },
];

const quickLinks = [
  { label: 'Manage Societies', href: '/dashboard/societies', icon: '🏘️' },
  { label: 'Review Businesses', href: '/dashboard/businesses', icon: '🏪' },
  { label: 'Approve Products', href: '/dashboard/products', icon: '🛍️' },
  { label: 'View Orders', href: '/dashboard/orders', icon: '📦' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError('');
    const res = await api.get<Stats>('/admin/stats');
    if (res.success && res.data) {
      setStats(res.data);
    } else {
      setError(res.error || 'Failed to load dashboard stats');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of the mohallaMitr platform</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading dashboard…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={loadStats} className="text-sm font-medium text-red-600 underline">Retry</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {statCards.map((card) => (
              <Link
                key={card.key}
                href={card.href}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{card.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {stats ? Number(stats[card.key] ?? 0).toLocaleString() : '0'}
                    </p>
                  </div>
                  <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center text-2xl text-white shadow-sm group-hover:scale-105 transition`}>
                    {card.icon}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-100 transition"
                >
                  <span className="text-2xl">{link.icon}</span>
                  <span className="text-sm font-semibold text-gray-700">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
