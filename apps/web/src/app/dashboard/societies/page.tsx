'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Society {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  description?: string;
  status: string;
  totalBusinesses?: number;
  totalUsers?: number;
}

const emptyForm = { name: '', address: '', city: '', state: '', pincode: '', description: '' };

export default function SocietiesPage() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadSocieties(); }, []);

  const loadSocieties = async () => {
    setLoading(true); setError('');
    const res = await api.get('/societies');
    if (res.success) setSocieties(res.data || []);
    else setError(res.error || 'Failed to load societies');
    setLoading(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(''); setSubmitting(true);
    const res = await api.post('/societies', form);
    if (res.success) { setShowModal(false); setForm(emptyForm); await loadSocieties(); }
    else setFormError(res.error || 'Failed to create society');
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this society? This cannot be undone.')) return;
    const res = await api.delete(`/societies/${id}`);
    if (res.success) setSocieties((p) => p.filter((s) => s.id !== id));
    else alert(res.error || 'Failed to delete');
  };

  const closeModal = () => { setShowModal(false); setForm(emptyForm); setFormError(''); };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Societies</h1>
          <p className="text-sm text-gray-500 mt-0.5">{societies.length} society{societies.length !== 1 ? 'ies' : 'y'} registered</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Society
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading societies…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={loadSocieties} className="text-sm font-medium text-red-600 hover:text-red-800 underline">Retry</button>
        </div>
      ) : societies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-3xl">🏘️</div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">No societies yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first society to get started.</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
            + New Society
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {societies.map((society) => (
            <div key={society.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{society.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{society.address}, {society.city}, {society.state} – {society.pincode}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  society.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {society.status}
                </span>
              </div>
              {society.description && (
                <p className="text-xs text-gray-400 line-clamp-2">{society.description}</p>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900">{society.totalBusinesses || 0}</p>
                    <p className="text-[10px] text-gray-400">Businesses</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900">{society.totalUsers || 0}</p>
                    <p className="text-[10px] text-gray-400">Users</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(society.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Create New Society</h2>
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
                <label className="block text-xs font-medium text-gray-700 mb-1">Society Name *</label>
                <input name="name" value={form.name} onChange={handleFormChange} required
                  placeholder="e.g. Green Valley Heights"
                  className="field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Address *</label>
                <input name="address" value={form.address} onChange={handleFormChange} required
                  placeholder="Street / Plot / Building"
                  className="field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
                  <input name="city" value={form.city} onChange={handleFormChange} required
                    placeholder="Mumbai"
                    className="field" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">State *</label>
                  <input name="state" value={form.state} onChange={handleFormChange} required
                    placeholder="Maharashtra"
                    className="field" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">PIN Code *</label>
                <input name="pincode" value={form.pincode} onChange={handleFormChange} required
                  pattern="[1-9][0-9]{5}" placeholder="400001"
                  className="field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description <span className="text-gray-400">(optional)</span></label>
                <textarea name="description" value={form.description} onChange={handleFormChange} rows={2}
                  placeholder="Brief description of the society…"
                  className="field resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                  {submitting ? 'Creating…' : 'Create Society'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
