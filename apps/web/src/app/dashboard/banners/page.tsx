'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  tagText?: string;
  ctaText?: string;
  ctaRoute?: string;
  societyId?: string;
  isActive: boolean;
  sortOrder?: number;
  startAt?: { seconds: number; nanoseconds: number } | null;
  endAt?: { seconds: number; nanoseconds: number } | null;
}

interface BannerForm {
  title: string;
  subtitle: string;
  imageUrl: string;
  tagText: string;
  ctaText: string;
  ctaRoute: string;
  societyId: string;
  sortOrder: string;
  isActive: boolean;
  startAt: string;
  endAt: string;
}

const EMPTY_FORM: BannerForm = {
  title: '',
  subtitle: '',
  imageUrl: '',
  tagText: 'TRENDING IN YOUR SOCIETY',
  ctaText: '',
  ctaRoute: '',
  societyId: 'global',
  sortOrder: '100',
  isActive: true,
  startAt: '',
  endAt: '',
};

function toDateTimeInput(value?: { seconds: number; nanoseconds: number } | null): string {
  if (!value || typeof value.seconds !== 'number') return '';
  const d = new Date(value.seconds * 1000);
  const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
  const local = new Date(d.getTime() - tzOffsetMs);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeInput(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    setError('');
    const res = await api.get<Banner[]>('/admin/banners');
    if (res.success) {
      setBanners((res.data || []).slice().sort((a, b) => Number(a.sortOrder ?? 100) - Number(b.sortOrder ?? 100)));
    } else {
      setError(res.error || 'Failed to load banners');
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return banners;
    return banners.filter((b) => {
      const haystack = [b.title, b.subtitle, b.tagText, b.societyId].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [banners, query]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      imageUrl: banner.imageUrl || '',
      tagText: banner.tagText || 'TRENDING IN YOUR SOCIETY',
      ctaText: banner.ctaText || '',
      ctaRoute: banner.ctaRoute || '',
      societyId: banner.societyId || 'global',
      sortOrder: String(banner.sortOrder ?? 100),
      isActive: Boolean(banner.isActive),
      startAt: toDateTimeInput(banner.startAt),
      endAt: toDateTimeInput(banner.endAt),
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const validate = (): string => {
    if (!form.title.trim()) return 'Title is required';
    if (!form.imageUrl.trim()) return 'Image URL is required';
    if (form.startAt && !fromDateTimeInput(form.startAt)) return 'Start date is invalid';
    if (form.endAt && !fromDateTimeInput(form.endAt)) return 'End date is invalid';
    if (form.startAt && form.endAt) {
      const start = new Date(form.startAt).getTime();
      const end = new Date(form.endAt).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
        return 'End date must be after start date';
      }
    }
    return '';
  };

  const buildPayload = () => ({
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    imageUrl: form.imageUrl.trim(),
    tagText: form.tagText.trim(),
    ctaText: form.ctaText.trim(),
    ctaRoute: form.ctaRoute.trim(),
    societyId: form.societyId.trim() || 'global',
    sortOrder: Number(form.sortOrder || '100'),
    isActive: form.isActive,
    startAt: fromDateTimeInput(form.startAt),
    endAt: fromDateTimeInput(form.endAt),
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setFormError(v);
      return;
    }

    setSaving(true);
    setFormError('');

    const payload = buildPayload();
    const res = editingId
      ? await api.put(`/admin/banners/${editingId}`, payload)
      : await api.post('/admin/banners', payload);

    if (res.success) {
      closeModal();
      await loadBanners();
    } else {
      setFormError(res.error || 'Failed to save banner');
    }

    setSaving(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete banner "${title}"? This cannot be undone.`)) return;
    const res = await api.delete(`/admin/banners/${id}`);
    if (res.success) {
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } else {
      alert(res.error || 'Failed to delete banner');
    }
  };

  const toggleActive = async (banner: Banner) => {
    const res = await api.put(`/admin/banners/${banner.id}`, { isActive: !banner.isActive });
    if (res.success) {
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, isActive: !banner.isActive } : b))
      );
    } else {
      alert(res.error || 'Failed to update banner');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banners</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage mobile resident home banners from web</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition shadow-sm"
        >
          + New Banner
        </button>
      </div>

      <div className="mb-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, tag or society"
          className="field max-w-md"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading banners…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={loadBanners} className="text-sm font-medium text-red-600 hover:text-red-800 underline">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-3xl">🖼️</div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">No banners found</h3>
          <p className="mt-1 text-sm text-gray-500">Create a banner to control mobile promotions without an app release.</p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
          >
            + New Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((banner) => (
            <div key={banner.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="w-full h-36 object-cover bg-gray-100"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{banner.title}</h3>
                  <span
                    className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      banner.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {banner.isActive ? 'active' : 'off'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-1">
                  {(banner.societyId || 'global')} · sort {banner.sortOrder ?? 100}
                </p>
                {banner.subtitle ? <p className="text-sm text-gray-600 line-clamp-2">{banner.subtitle}</p> : null}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    onClick={() => openEdit(banner)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(banner)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition ${
                      banner.isActive
                        ? 'text-red-600 hover:text-red-700 border-red-200 hover:border-red-400 bg-red-50 hover:bg-red-100'
                        : 'text-green-600 hover:text-green-700 border-green-200 hover:border-green-400 bg-green-50 hover:bg-green-100'
                    }`}
                  >
                    {banner.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id, banner.title)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-gray-900">{editingId ? 'Edit Banner' : 'Create Banner'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{formError}</div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                  className="field"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Subtitle</label>
                <textarea
                  value={form.subtitle}
                  onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                  rows={2}
                  className="field resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Image URL *</label>
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                  required
                  className="field"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tag Text</label>
                  <input
                    value={form.tagText}
                    onChange={(e) => setForm((p) => ({ ...p, tagText: e.target.value }))}
                    className="field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Society ID</label>
                  <input
                    value={form.societyId}
                    onChange={(e) => setForm((p) => ({ ...p, societyId: e.target.value }))}
                    placeholder="global"
                    className="field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CTA Text</label>
                  <input
                    value={form.ctaText}
                    onChange={(e) => setForm((p) => ({ ...p, ctaText: e.target.value }))}
                    className="field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CTA Route</label>
                  <input
                    value={form.ctaRoute}
                    onChange={(e) => setForm((p) => ({ ...p, ctaRoute: e.target.value }))}
                    placeholder="/orders"
                    className="field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sort Order</label>
                  <input
                    value={form.sortOrder}
                    onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value.replace(/[^0-9]/g, '') }))}
                    className="field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start At</label>
                  <input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))}
                    className="field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End At</label>
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))}
                    className="field"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                Active banner
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving…' : 'Save Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
