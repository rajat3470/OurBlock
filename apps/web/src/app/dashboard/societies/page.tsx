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

interface OwnerForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface OwnerResult {
  email: string;
  temporaryPassword: string;
}

const emptyForm = { name: '', address: '', city: '', state: '', pincode: '', description: '' };
const emptyOwnerForm: OwnerForm = { firstName: '', lastName: '', email: '', phone: '' };

export default function SocietiesPage() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Create business owner
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerSociety, setOwnerSociety] = useState<{ id: string; name: string } | null>(null);
  const [ownerForm, setOwnerForm] = useState<OwnerForm>(emptyOwnerForm);
  const [ownerFormError, setOwnerFormError] = useState('');
  const [ownerSubmitting, setOwnerSubmitting] = useState(false);
  const [ownerResult, setOwnerResult] = useState<OwnerResult | null>(null);
  const [copied, setCopied] = useState<'email' | 'password' | null>(null);

  // Society detail / edit drawer
  const [drawerSociety, setDrawerSociety] = useState<Society | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => { loadSocieties(); }, []);

  const loadSocieties = async () => {
    setLoading(true); setError('');
    const res = await api.get('/admin/societies');
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

  const openSocietyDrawer = (society: Society) => {
    setDrawerSociety(society);
    setEditMode(false);
    setEditForm({ name: society.name, address: society.address, city: society.city, state: society.state, pincode: society.pincode, description: society.description || '' });
    setEditError('');
    setDrawerOpen(true);
  };

  const closeSocietyDrawer = () => { setDrawerOpen(false); setDrawerSociety(null); setEditMode(false); };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEditForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawerSociety) return;
    setEditError(''); setEditSubmitting(true);
    const res = await api.put(`/societies/${drawerSociety.id}`, editForm);
    if (res.success) {
      const updated = { ...drawerSociety, ...editForm };
      setDrawerSociety(updated);
      setSocieties((p) => p.map((s) => s.id === updated.id ? updated : s));
      setEditMode(false);
    } else {
      setEditError(res.error || 'Failed to update society');
    }
    setEditSubmitting(false);
  };

  const openOwnerModal = (society: Society) => {
    setOwnerSociety({ id: society.id, name: society.name });
    setOwnerForm(emptyOwnerForm);
    setOwnerFormError('');
    setOwnerResult(null);
    setCopied(null);
    setShowOwnerModal(true);
  };

  const closeOwnerModal = () => {
    setShowOwnerModal(false);
    setOwnerSociety(null);
    setOwnerResult(null);
  };

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerFormError('');
    if (!ownerSociety) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerForm.email)) {
      setOwnerFormError('Enter a valid email address');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(ownerForm.phone)) {
      setOwnerFormError('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setOwnerSubmitting(true);
    const res = await api.post('/admin/business-owners', { ...ownerForm, societyId: ownerSociety.id });
    if (res.success) {
      setOwnerResult({ email: res.data.email, temporaryPassword: res.data.temporaryPassword });
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
                <div className="flex items-center gap-3">
                  <button onClick={() => openSocietyDrawer(society)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition">
                    View Details
                  </button>
                  <button onClick={() => openOwnerModal(society)}
                    className="text-xs font-semibold text-green-600 hover:text-green-800 border border-green-200 hover:border-green-400 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-lg transition">
                    + Owner
                  </button>
                  <button onClick={() => handleDelete(society.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium transition">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Society Detail / Edit Drawer */}
      {drawerOpen && drawerSociety && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={closeSocietyDrawer} />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏘️</span>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 leading-tight">{drawerSociety.name}</h2>
                  <p className="text-xs text-gray-500">{drawerSociety.city}, {drawerSociety.state}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!editMode && (
                  <button onClick={() => setEditMode(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                )}
                <button onClick={closeSocietyDrawer} className="text-gray-400 hover:text-gray-600 transition p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 px-6 py-5">
              {editMode ? (
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  {editError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{editError}</div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Society Name *</label>
                    <input name="name" value={editForm.name} onChange={handleEditFormChange} required className="field" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Address *</label>
                    <input name="address" value={editForm.address} onChange={handleEditFormChange} required className="field" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
                      <input name="city" value={editForm.city} onChange={handleEditFormChange} required className="field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">State *</label>
                      <input name="state" value={editForm.state} onChange={handleEditFormChange} required className="field" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">PIN Code *</label>
                    <input name="pincode" value={editForm.pincode} onChange={handleEditFormChange} required pattern="[1-9][0-9]{5}" className="field" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description <span className="text-gray-400">(optional)</span></label>
                    <textarea name="description" value={editForm.description} onChange={handleEditFormChange} rows={2} className="field resize-none" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setEditMode(false)}
                      className="flex-1 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                    <button type="submit" disabled={editSubmitting}
                      className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                      {editSubmitting ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Status */}
                  <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${
                    drawerSociety.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {drawerSociety.status}
                  </span>

                  {/* Details */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Society Details</h3>
                    <dl className="space-y-2.5">
                      {([
                        ['Name', drawerSociety.name],
                        ['Address', drawerSociety.address],
                        ['City', drawerSociety.city],
                        ['State', drawerSociety.state],
                        ['PIN Code', drawerSociety.pincode],
                      ] as [string, string][]).map(([label, value]) => (
                        <div key={label} className="flex gap-3">
                          <dt className="w-24 shrink-0 text-xs text-gray-400 pt-0.5">{label}</dt>
                          <dd className="flex-1 text-sm text-gray-800 break-words">{value}</dd>
                        </div>
                      ))}
                      {drawerSociety.description && (
                        <div className="flex gap-3">
                          <dt className="w-24 shrink-0 text-xs text-gray-400 pt-0.5">Description</dt>
                          <dd className="flex-1 text-sm text-gray-800">{drawerSociety.description}</dd>
                        </div>
                      )}
                    </dl>
                  </section>

                  {/* Stats */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Statistics</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-indigo-50 rounded-xl px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-indigo-700">{drawerSociety.totalBusinesses ?? 0}</p>
                        <p className="text-xs text-indigo-500 mt-0.5">Businesses</p>
                      </div>
                      <div className="bg-green-50 rounded-xl px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-green-700">{drawerSociety.totalUsers ?? 0}</p>
                        <p className="text-xs text-green-500 mt-0.5">Users</p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>

            {/* Footer */}
            {!editMode && (
              <div className="px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
                <button onClick={() => { closeSocietyDrawer(); handleDelete(drawerSociety.id); }}
                  className="w-full py-2 text-sm font-semibold rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition">
                  Delete Society
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Business Owner Modal */}
      {showOwnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Create Business Owner</h2>
                {ownerSociety && (
                  <p className="text-xs text-gray-500 mt-0.5">Society: <span className="font-medium text-gray-700">{ownerSociety.name}</span></p>
                )}
              </div>
              <button onClick={closeOwnerModal} className="text-gray-400 hover:text-gray-600 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {ownerResult ? (
              /* ── Credentials display ── */
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm font-medium text-green-800">Account created successfully!</p>
                </div>
                <p className="text-xs text-gray-500">Share these credentials securely with the business owner. They will be prompted to change their password on first login.</p>
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
              /* ── Form ── */
              <form onSubmit={handleCreateOwner} className="px-6 py-5 space-y-4">
                {ownerFormError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{ownerFormError}</div>
                )}
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

      {/* Create Society Modal */}
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
