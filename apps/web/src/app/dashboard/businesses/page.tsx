'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Business {
  id: string;
  name: string;
  category: string;
  phone: string;
  address: string;
  societyId?: string;
  status: string;
  isVerified: boolean;
  rating: number;
  totalReviews: number;
}

interface Society { id: string; name: string; }

const emptyForm = { name: '', category: '', phone: '', address: '', societyId: '', description: '', email: '' };

const CATEGORIES = ['Grocery', 'Restaurant', 'Pharmacy', 'Electronics', 'Clothing', 'Beauty & Salon', 'Fitness', 'Education', 'Services', 'Other'];

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterSociety, setFilterSociety] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (!loading) loadBusinesses(); }, [filterSociety]);

  const loadData = async () => {
    const [bizRes, socRes] = await Promise.all([api.get('/businesses'), api.get('/societies')]);
    if (bizRes.success) setBusinesses(bizRes.data || []); else setError(bizRes.error || 'Failed to load');
    if (socRes.success) setSocieties(socRes.data || []);
    setLoading(false);
  };

  const loadBusinesses = async () => {
    setLoading(true); setError('');
    const endpoint = filterSociety ? `/businesses?societyId=${filterSociety}&status=active` : '/businesses';
    const res = await api.get(endpoint);
    if (res.success) setBusinesses(res.data || []); else setError(res.error || 'Failed to load');
    setLoading(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(''); setSubmitting(true);
    const payload: any = { ...form };
    if (!payload.email) delete payload.email;
    if (!payload.description) delete payload.description;
    if (!payload.societyId) delete payload.societyId;
    const res = await api.post('/businesses', payload);
    if (res.success) { setShowModal(false); setForm(emptyForm); await loadBusinesses(); }
    else setFormError(res.error || 'Failed to create business');
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this business? This cannot be undone.')) return;
    const res = await api.delete(`/businesses/${id}`);
    if (res.success) setBusinesses((p) => p.filter((b) => b.id !== id));
    else alert(res.error || 'Failed to delete');
  };

  const closeModal = () => { setShowModal(false); setForm(emptyForm); setFormError(''); };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
          <p className="text-sm text-gray-500 mt-0.5">{businesses.length} business{businesses.length !== 1 ? 'es' : ''} found</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterSociety}
            onChange={(e) => setFilterSociety(e.target.value)}
            className="field w-auto text-gray-900 bg-white"
          >
            <option value="">All Societies</option>
            {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Business
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading businesses…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={loadBusinesses} className="text-sm font-medium text-red-600 underline">Retry</button>
        </div>
      ) : businesses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-3xl">🏪</div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">No businesses found</h3>
          <p className="mt-1 text-sm text-gray-500">Try a different filter or add a new business.</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
            + New Business
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {businesses.map((biz) => (
            <div key={biz.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{biz.name}</h3>
                    {biz.isVerified && (
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full shrink-0">✓ Verified</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{biz.category} · {biz.phone}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  biz.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {biz.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 line-clamp-1">{biz.address}</p>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>⭐</span>
                  <span className="font-medium text-gray-700">{biz.rating || 0}</span>
                  <span className="text-gray-400">({biz.totalReviews || 0} reviews)</span>
                </div>
                <button onClick={() => handleDelete(biz.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Business Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-semibold text-gray-900">Create New Business</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{formError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Business Name *</label>
                <input name="name" value={form.name} onChange={handleFormChange} required
                  placeholder="e.g. Sharma Grocery Store" className="field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                <select name="category" value={form.category} onChange={handleFormChange} required className="field text-gray-900 bg-white">
                  <option value="" disabled>Select a category…</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
                  <input name="phone" value={form.phone} onChange={handleFormChange} required
                    pattern="[6-9][0-9]{9}" placeholder="9876543210" className="field" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleFormChange}
                    placeholder="business@email.com" className="field" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Address *</label>
                <input name="address" value={form.address} onChange={handleFormChange} required
                  placeholder="Shop / Building / Area" className="field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Society</label>
                <select name="societyId" value={form.societyId} onChange={handleFormChange} className="field text-gray-900 bg-white">
                  <option value="">— None —</option>
                  {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description <span className="text-gray-400">(optional)</span></label>
                <textarea name="description" value={form.description} onChange={handleFormChange} rows={2}
                  placeholder="What does this business offer?" className="field resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                  {submitting ? 'Creating…' : 'Create Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
