'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Order {
  id: string;
  userName?: string;
  userPhone?: string;
  businessName?: string;
  status: string;
  totalAmount: number;
  finalAmount?: number;
  paymentMethod?: string;
  createdAt?: any;
  deliveryAddress?: { street?: string; city?: string };
}

const ORDER_STATUSES = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'rejected'];

const statusMeta: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmed', cls: 'bg-blue-100 text-blue-800' },
  preparing: { label: 'Preparing', cls: 'bg-indigo-100 text-indigo-800' },
  ready: { label: 'Ready', cls: 'bg-cyan-100 text-cyan-800' },
  out_for_delivery: { label: 'Out for Delivery', cls: 'bg-sky-100 text-sky-800' },
  delivered: { label: 'Delivered', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-800' },
  rejected: { label: 'Rejected', cls: 'bg-gray-100 text-gray-800' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [status, page]);

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    const endpoint = status === 'all' ? `/admin/orders?page=${page}&limit=25` : `/admin/orders?status=${status}&page=${page}&limit=25`;
    const res = await api.get<Order[]>(endpoint);
    if (res.success && res.data) {
      setOrders(res.data);
      setHasMore(res.data.length === 25);
    } else {
      setError(res.error || 'Failed to load orders');
      setOrders([]);
      setHasMore(false);
    }
    setLoading(false);
  };

  const formatDate = (value: any) => {
    if (!value) return '—';
    const date = value.seconds ? new Date(value.seconds * 1000) : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount?: number) => {
    if (amount === undefined || amount === null) return '—';
    return `₹${Number(amount).toFixed(2)}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage customer orders across the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="field w-auto text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All Statuses' : statusMeta[s]?.label ?? s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading orders…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={loadOrders} className="text-sm font-medium text-red-600 underline">Retry</button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-3xl">📦</div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">No orders found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {status === 'all' ? 'Orders will appear here once customers start placing them.' : `No orders with status "${status}".`}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Business</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => {
                    const meta = statusMeta[order.status] ?? { label: order.status, cls: 'bg-gray-100 text-gray-800' };
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-gray-900">#{order.id.slice(-6).toUpperCase()}</p>
                          <p className="text-xs text-gray-400">{order.paymentMethod?.toUpperCase() ?? 'COD'}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm text-gray-900">{order.userName || 'Guest'}</p>
                          <p className="text-xs text-gray-400">{order.userPhone || '—'}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm text-gray-700">{order.businessName || '—'}</p>
                          <p className="text-xs text-gray-400">
                            {order.deliveryAddress ? `${order.deliveryAddress.street || ''}, ${order.deliveryAddress.city || ''}` : '—'}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.cls}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-bold text-gray-900">{formatAmount(order.finalAmount ?? order.totalAmount)}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm text-gray-700">{formatDate(order.createdAt)}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
