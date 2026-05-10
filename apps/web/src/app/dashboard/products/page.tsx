'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Product {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  stock: number;
  status: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvalNote?: string;
  businessId: string;
  businessName?: string;
  createdAt?: any;
}

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

const DOT: Record<ApprovalStatus, string> = {
  pending: 'bg-amber-400',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
};

const BADGE: Record<ApprovalStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const TAB_BORDER: Record<ApprovalStatus, string> = {
  pending: 'border-amber-400 text-amber-700',
  approved: 'border-green-500 text-green-700',
  rejected: 'border-red-500 text-red-700',
};

const ICONS: Record<ApprovalStatus, string> = {
  pending: '⏳',
  approved: '✓',
  rejected: '✗',
};

interface Society { id: string; name: string; }
interface BusinessMeta { id: string; name: string; societyId?: string; }

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [allProducts, setAllProducts] = useState<Record<ApprovalStatus, Product[]>>({
    pending: [],
    approved: [],
    rejected: [],
  });
  const [loading, setLoading] = useState(true);
  const [tabRefreshing, setTabRefreshing] = useState<ApprovalStatus | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<ApprovalStatus>('pending');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Search / filter — pre-seeded from URL params
  const [search, setSearch] = useState('');
  const [filterSocietyId, setFilterSocietyId] = useState(() => searchParams.get('societyId') || '');
  const [filterBizId, setFilterBizId] = useState(() => searchParams.get('businessId') || '');
  const [filterBizName, setFilterBizName] = useState(() => searchParams.get('businessName') || '');

  // Reference data for filters
  const [societies, setSocieties] = useState<Society[]>([]);
  const [businessMeta, setBusinessMeta] = useState<BusinessMeta[]>([]);

  // Detail panel
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<'single' | 'bulk' | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Per-row action loading
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    loadAll();
    // Honour tab param from URL
    const tab = searchParams.get('tab') as ApprovalStatus | null;
    if (tab && ['pending', 'approved', 'rejected'].includes(tab)) setActiveTab(tab);
  }, []);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadAll = async () => {
    setLoading(true);
    setError('');
    const [pendingRes, approvedRes, rejectedRes, socRes, bizRes] = await Promise.all([
      api.get('/admin/products?approvalStatus=pending&limit=200'),
      api.get('/admin/products?approvalStatus=approved&limit=200'),
      api.get('/admin/products?approvalStatus=rejected&limit=200'),
      api.get('/admin/societies?limit=100'),
      api.get('/admin/businesses?limit=500'),
    ]);
    setAllProducts({
      pending: pendingRes.success ? pendingRes.data || [] : [],
      approved: approvedRes.success ? approvedRes.data || [] : [],
      rejected: rejectedRes.success ? rejectedRes.data || [] : [],
    });
    if (socRes.success) setSocieties(socRes.data || []);
    if (bizRes.success)
      setBusinessMeta(
        (bizRes.data || []).map((b: any) => ({ id: b.id, name: b.name, societyId: b.societyId })),
      );
    if (!pendingRes.success && !approvedRes.success && !rejectedRes.success) {
      setError('Failed to load products');
    }
    setLoading(false);
  };

  const loadTab = async (tab: ApprovalStatus) => {
    setTabRefreshing(tab);
    const res = await api.get(`/admin/products?approvalStatus=${tab}&limit=200`);
    if (res.success) setAllProducts((prev) => ({ ...prev, [tab]: res.data || [] }));
    setTabRefreshing(null);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const moveProduct = (
    id: string,
    from: ApprovalStatus,
    to: ApprovalStatus,
    note?: string,
  ) => {
    setAllProducts((prev) => {
      const product = prev[from].find((p) => p.id === id);
      if (!product) return prev;
      const updated: Product = {
        ...product,
        approvalStatus: to,
        status: to === 'approved' ? 'active' : 'inactive',
        ...(note !== undefined ? { approvalNote: note } : {}),
      };
      return {
        ...prev,
        [from]: prev[from].filter((p) => p.id !== id),
        [to]: [updated, ...prev[to]],
      };
    });
    setSelected((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
    setDetailProduct((prev) => {
      if (!prev || prev.id !== id) return prev;
      return {
        ...prev,
        approvalStatus: to,
        status: to === 'approved' ? 'active' : 'inactive',
        ...(note !== undefined ? { approvalNote: note } : {}),
      };
    });
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleApprove = async (product: Product) => {
    setActionLoading((prev) => new Set(prev).add(product.id));
    const res = await api.post(`/admin/products/${product.id}/approve`, {});
    if (res.success) moveProduct(product.id, product.approvalStatus, 'approved');
    setActionLoading((prev) => {
      const s = new Set(prev);
      s.delete(product.id);
      return s;
    });
  };

  const handleRejectSubmit = async () => {
    setRejectSubmitting(true);
    if (rejectTarget === 'single' && detailProduct) {
      const res = await api.post(`/admin/products/${detailProduct.id}/reject`, { note: rejectNote });
      if (res.success) moveProduct(detailProduct.id, detailProduct.approvalStatus, 'rejected', rejectNote);
    } else if (rejectTarget === 'bulk') {
      const ids = Array.from(selected);
      await Promise.all(ids.map((id) => api.post(`/admin/products/${id}/reject`, { note: rejectNote })));
      ids.forEach((id) => {
        const from = (Object.entries(allProducts) as [ApprovalStatus, Product[]][]).find(
          ([, prods]) => prods.some((p) => p.id === id),
        )?.[0];
        if (from) moveProduct(id, from, 'rejected', rejectNote);
      });
      setSelected(new Set());
    }
    setRejectSubmitting(false);
    setRejectTarget(null);
    setRejectNote('');
  };

  const handleBulkApprove = async () => {
    setBulkLoading(true);
    const ids = Array.from(selected);
    await Promise.all(ids.map((id) => api.post(`/admin/products/${id}/approve`, {})));
    ids.forEach((id) => {
      const from = (Object.entries(allProducts) as [ApprovalStatus, Product[]][]).find(
        ([, prods]) => prods.some((p) => p.id === id),
      )?.[0];
      if (from) moveProduct(id, from, 'approved');
    });
    setSelected(new Set());
    setBulkLoading(false);
  };

  // ── Selection ──────────────────────────────────────────────────────────────

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const toggleSelectAll = () => {
    setSelected(
      selected.size === products.length && products.length > 0
        ? new Set()
        : new Set(products.map((p) => p.id)),
    );
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const products = useMemo(() => {
    let list = allProducts[activeTab];
    if (filterSocietyId) {
      const bizIdsInSociety = new Set(
        businessMeta.filter((b) => b.societyId === filterSocietyId).map((b) => b.id),
      );
      list = list.filter((p) => bizIdsInSociety.has(p.businessId));
    }
    if (filterBizId) list = list.filter((p) => p.businessId === filterBizId);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.businessName || '').toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [allProducts, activeTab, search, filterSocietyId, filterBizId, businessMeta]);

  // All businesses, optionally scoped to selected society.
  // Falls back to enriching with businessName from products if businessMeta missed any.
  const filteredBusinessOptions = useMemo(() => {
    // Start with all businesses from the reference list
    const base = businessMeta.filter(
      (b) => !filterSocietyId || b.societyId === filterSocietyId,
    );

    // Also include any businesses found in products but missing from businessMeta
    const knownIds = new Set(base.map((b) => b.id));
    const fromProducts: BusinessMeta[] = [];
    (Object.values(allProducts) as Product[][]).flat().forEach((p) => {
      if (p.businessId && !knownIds.has(p.businessId)) {
        knownIds.add(p.businessId);
        fromProducts.push({ id: p.businessId, name: p.businessName || p.businessId });
      }
    });

    return [...base, ...fromProducts].sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts, businessMeta, filterSocietyId]);

  const totalProducts =
    allProducts.pending.length + allProducts.approved.length + allProducts.rejected.length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <button
              onClick={() => router.push('/dashboard/businesses')}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              ← Businesses
            </button>
            {filterBizId && filterBizName && (
              <>
                <span className="text-xs text-gray-300">/</span>
                <span className="text-xs font-semibold text-gray-700">{filterBizName}</span>
              </>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {filterBizId && filterBizName ? `${filterBizName} — Products` : 'Product Approvals'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {filterBizId
              ? 'Showing products for this business only. Only approved products are visible to users.'
              : 'Review products submitted by business owners. Only approved products are visible to users.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filterBizId && (
            <button
              onClick={() => { setFilterBizId(''); setFilterBizName(''); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition"
            >
              ✕ Clear filter
            </button>
          )}
          <button
            onClick={loadAll}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            ↻ Refresh All
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-8 shrink-0">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setActiveTab(s);
              setSelected(new Set());
              setSearch('');
              setFilterSocietyId('');
              setFilterBizId('');
            }}
            className="flex items-center gap-2 group"
          >
            <div className={`w-2.5 h-2.5 rounded-full ${DOT[s]}`} />
            <span className="text-xs text-gray-500 group-hover:text-gray-800 transition capitalize">{s}</span>
            <span
              className={`text-sm font-bold transition ${
                activeTab === s
                  ? s === 'pending'
                    ? 'text-amber-700'
                    : s === 'approved'
                    ? 'text-green-700'
                    : 'text-red-700'
                  : 'text-gray-600'
              }`}
            >
              {loading ? '—' : allProducts[s].length}
            </span>
          </button>
        ))}
        {!loading && (
          <span className="ml-auto text-xs text-gray-400">
            {totalProducts} product{totalProducts !== 1 ? 's' : ''} total
          </span>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shrink-0">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-sm">Loading products…</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* List pane */}
          <div
            className={`flex flex-col border-r border-gray-200 bg-white transition-all ${
              detailProduct ? 'w-[55%] xl:w-[60%]' : 'flex-1'
            }`}
          >
            {/* Toolbar */}
            <div className="px-4 pt-3 pb-2 border-b border-gray-100 space-y-2.5 shrink-0">
              {/* Tabs */}
              <div className="flex gap-0 border-b border-gray-200">
                {(['pending', 'approved', 'rejected'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setSelected(new Set());
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition ${
                      activeTab === tab
                        ? TAB_BORDER[tab]
                        : 'border-transparent text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    <span>{ICONS[tab]}</span>
                    <span className="capitalize">{tab}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${BADGE[tab]}`}>
                      {allProducts[tab].length}
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => loadTab(activeTab)}
                  className="ml-auto px-2 py-1 text-xs text-gray-400 hover:text-gray-700 transition"
                  title="Refresh this tab"
                >
                  {tabRefreshing === activeTab ? (
                    <span className="animate-spin inline-block">↻</span>
                  ) : (
                    '↻'
                  )}
                </button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search by product, business, or category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-sm leading-none"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Society → Business cascade filters */}
              <div className="flex gap-2">
                <select
                  value={filterSocietyId}
                  onChange={(e) => {
                    setFilterSocietyId(e.target.value);
                    setFilterBizId('');
                  }}
                  className={`flex-1 text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                    filterSocietyId
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-800 font-semibold'
                      : 'border-gray-200 bg-gray-50 text-gray-700'
                  }`}
                >
                  <option value="">All societies</option>
                  {societies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                {filterSocietyId && (
                  <select
                    value={filterBizId}
                    onChange={(e) => setFilterBizId(e.target.value)}
                    className={`flex-1 text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                      filterBizId
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-800 font-semibold'
                        : 'border-gray-200 bg-gray-50 text-gray-700'
                    }`}
                  >
                    <option value="">All businesses</option>
                    {filteredBusinessOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}

                {(filterSocietyId || filterBizId) && (
                  <button
                    onClick={() => {
                      setFilterSocietyId('');
                      setFilterBizId('');
                    }}
                    className="px-2 py-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg bg-red-50 hover:bg-red-100 transition shrink-0"
                    title="Clear filters"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 border-b border-indigo-100 shrink-0">
                <span className="text-xs font-semibold text-indigo-700">{selected.size} selected</span>
                {activeTab !== 'approved' && (
                  <button
                    onClick={handleBulkApprove}
                    disabled={bulkLoading}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    ✓ Approve all
                  </button>
                )}
                {activeTab !== 'rejected' && (
                  <button
                    onClick={() => {
                      setRejectTarget('bulk');
                      setRejectNote('');
                    }}
                    disabled={bulkLoading}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    ✗ Reject all
                  </button>
                )}
                <button
                  onClick={() => setSelected(new Set())}
                  className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 transition"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Table header */}
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">
              <input
                type="checkbox"
                className="rounded"
                checked={selected.size === products.length && products.length > 0}
                onChange={toggleSelectAll}
              />
              <span className="w-3 shrink-0" />
              <span className="flex-1">Product / Business</span>
              <span className="w-16 text-right shrink-0">Price</span>
              <span className="w-16 text-right shrink-0">Stock</span>
              <span className="w-20 text-right shrink-0">Actions</span>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <span className="text-5xl mb-3">📦</span>
                  <p className="text-sm font-semibold text-gray-500">No {activeTab} products</p>
                  <p className="text-xs mt-1.5 text-center max-w-xs">
                    {activeTab === 'pending'
                      ? 'No products are awaiting your review. New products from business owners will appear here.'
                      : activeTab === 'approved'
                      ? 'No approved products yet. Approve a pending product to make it visible to users.'
                      : 'No rejected products. Rejected products appear here so you can re-review them.'}
                  </p>
                  {(search || filterBizId || filterSocietyId) && (
                    <button
                      onClick={() => {
                        setSearch('');
                        setFilterSocietyId('');
                        setFilterBizId('');
                      }}
                      className="mt-4 text-xs font-semibold text-indigo-500 hover:text-indigo-700 underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                products.map((product) => {
                  const isSelected = selected.has(product.id);
                  const isActive = detailProduct?.id === product.id;
                  const isLoading = actionLoading.has(product.id);
                  return (
                    <div
                      key={product.id}
                      onClick={() => setDetailProduct(isActive ? null : product)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-l-2 ${
                        isActive
                          ? 'bg-indigo-50 border-indigo-500'
                          : isSelected
                          ? 'bg-blue-50 border-transparent'
                          : 'hover:bg-gray-50 border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="rounded shrink-0"
                        checked={isSelected}
                        onChange={() => toggleSelect(product.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className={`shrink-0 w-1 h-9 rounded-full ${DOT[product.approvalStatus]}`} />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold truncate ${
                            isActive ? 'text-indigo-900' : 'text-gray-900'
                          }`}
                        >
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {product.businessName || product.businessId}
                          <span className="mx-1">·</span>
                          <span className="text-gray-500">{product.category}</span>
                        </p>
                        {product.approvalStatus === 'rejected' && product.approvalNote && (
                          <p className="text-[11px] text-red-500 truncate mt-0.5">
                            Reason: {product.approvalNote}
                          </p>
                        )}
                      </div>
                      <span className="w-16 text-right text-sm font-bold text-gray-900 shrink-0">
                        ₹{product.price}
                      </span>
                      <span className="w-16 text-right text-xs text-gray-500 shrink-0">
                        {product.stock} pcs
                      </span>
                      <div
                        className="w-20 flex justify-end gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {product.approvalStatus !== 'approved' && (
                          <button
                            onClick={() => handleApprove(product)}
                            disabled={isLoading}
                            title="Approve"
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-green-100 text-green-700 hover:bg-green-600 hover:text-white transition disabled:opacity-40 text-xs font-bold"
                          >
                            {isLoading ? <span className="animate-spin">↻</span> : '✓'}
                          </button>
                        )}
                        {product.approvalStatus !== 'rejected' && (
                          <button
                            onClick={() => {
                              setDetailProduct(product);
                              setRejectTarget('single');
                              setRejectNote('');
                            }}
                            disabled={isLoading}
                            title="Reject"
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition disabled:opacity-40 border border-red-200 text-xs font-bold"
                          >
                            ✗
                          </button>
                        )}
                        {product.approvalStatus === 'rejected' && (
                          <button
                            onClick={() => handleApprove(product)}
                            disabled={isLoading}
                            title="Re-approve"
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-green-100 text-green-700 hover:bg-green-600 hover:text-white transition disabled:opacity-40 text-xs font-bold"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* List footer */}
            <div className="px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400 flex justify-between shrink-0">
              <span>
                {products.length} product{products.length !== 1 ? 's' : ''}
                {(search || filterBizId || filterSocietyId) &&
                  ` (filtered from ${allProducts[activeTab].length})`}
              </span>
              {selected.size > 0 && (
                <span className="text-indigo-500">{selected.size} selected</span>
              )}
            </div>
          </div>

          {/* Detail pane */}
          {detailProduct && (
            <div className="flex flex-col bg-white overflow-y-auto w-[45%] xl:w-[40%]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3 sticky top-0 bg-white z-10">
                <div className="min-w-0">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${BADGE[detailProduct.approvalStatus]}`}
                  >
                    {ICONS[detailProduct.approvalStatus]}{' '}
                    <span className="capitalize">{detailProduct.approvalStatus}</span>
                  </span>
                  <h2 className="text-base font-bold text-gray-900 break-words leading-snug">
                    {detailProduct.name}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">{detailProduct.category}</p>
                </div>
                <button
                  onClick={() => setDetailProduct(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 shrink-0 transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 px-6 py-5 space-y-6">
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Price', value: `₹${detailProduct.price}` },
                    { label: 'Stock', value: `${detailProduct.stock} pcs` },
                    { label: 'Live Status', value: detailProduct.status },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="bg-gray-50 rounded-xl px-3 py-3 text-center border border-gray-100"
                    >
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">{label}</p>
                      <p className="text-sm font-bold text-gray-900">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Info */}
                <section>
                  <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Product Info
                  </h3>
                  <dl className="space-y-3">
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 text-xs text-gray-400 pt-0.5">Business</dt>
                      <dd className="flex-1 text-sm text-gray-800 font-medium">
                        {detailProduct.businessName || detailProduct.businessId}
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 text-xs text-gray-400 pt-0.5">Category</dt>
                      <dd className="flex-1 text-sm text-gray-800">{detailProduct.category}</dd>
                    </div>
                    {detailProduct.description && (
                      <div className="flex gap-3">
                        <dt className="w-24 shrink-0 text-xs text-gray-400 pt-0.5">Description</dt>
                        <dd className="flex-1 text-sm text-gray-800">{detailProduct.description}</dd>
                      </div>
                    )}
                    {detailProduct.createdAt && (
                      <div className="flex gap-3">
                        <dt className="w-24 shrink-0 text-xs text-gray-400 pt-0.5">Submitted</dt>
                        <dd className="flex-1 text-sm text-gray-800">
                          {detailProduct.createdAt._seconds
                            ? new Date(
                                detailProduct.createdAt._seconds * 1000,
                              ).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })
                            : String(detailProduct.createdAt)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>

                {/* Rejection note */}
                {detailProduct.approvalStatus === 'rejected' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-semibold text-red-500 uppercase mb-1">
                      Rejection Reason
                    </p>
                    <p className="text-sm text-red-700">
                      {detailProduct.approvalNote || 'No reason provided.'}
                    </p>
                  </div>
                )}

                {/* Approved notice */}
                {detailProduct.approvalStatus === 'approved' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-green-600 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <p className="text-sm text-green-800 font-medium">
                      Live — visible to users in the app
                    </p>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="px-6 py-4 border-t border-gray-100 flex flex-col gap-2 sticky bottom-0 bg-white">
                {detailProduct.approvalStatus !== 'approved' && (
                  <button
                    onClick={() => handleApprove(detailProduct)}
                    disabled={actionLoading.has(detailProduct.id)}
                    className="w-full py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    {actionLoading.has(detailProduct.id) ? 'Approving…' : '✓ Approve Product'}
                  </button>
                )}
                {detailProduct.approvalStatus !== 'rejected' && (
                  <button
                    onClick={() => {
                      setRejectTarget('single');
                      setRejectNote('');
                    }}
                    className="w-full py-2.5 rounded-xl border border-red-200 text-red-700 font-semibold text-sm hover:bg-red-50 transition"
                  >
                    ✗ Reject Product
                  </button>
                )}
                {detailProduct.approvalStatus === 'rejected' && (
                  <button
                    onClick={() => handleApprove(detailProduct)}
                    disabled={actionLoading.has(detailProduct.id)}
                    className="w-full py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    ✓ Re-approve Product
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rejection modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRejectTarget(null)} />
          <div className="relative z-50 bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {rejectTarget === 'bulk'
                ? `Reject ${selected.size} product${selected.size !== 1 ? 's' : ''}?`
                : `Reject "${detailProduct?.name}"?`}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {rejectTarget === 'bulk'
                ? 'The same reason will be sent to all selected business owners.'
                : 'The business owner will see this reason. This product will not be shown to users.'}
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={rejectSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-60 transition"
              >
                {rejectSubmitting ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
