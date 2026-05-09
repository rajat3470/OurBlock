'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Business {
  id: string;
  name: string;
  category: string;
  phone: string;
  email?: string;
  address: string;
  description?: string;
  societyId?: string;
  ownerId?: string;
  status: string;
  isVerified: boolean;
  rating: number;
  totalReviews: number;
  createdAt?: any;
}

interface Owner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  verificationStatus?: string;
  createdAt?: any;
}

interface Society { id: string; name: string; city: string; }

type Step = 'society' | 'details' | 'owner' | 'done';

const emptyDetails = { name: '', category: '', phone: '', address: '', description: '', email: '' };
const emptyOwner = { firstName: '', lastName: '', email: '', phone: '' };

interface OwnerResult { email: string; temporaryPassword: string; }

const CATEGORIES = ['Grocery', 'Restaurant', 'Pharmacy', 'Electronics', 'Clothing', 'Beauty & Salon', 'Fitness', 'Education', 'Services', 'Other'];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-xs text-gray-400 pt-0.5">{label}</dt>
      <dd className="flex-1 text-sm text-gray-800 break-words">{value}</dd>
    </div>
  );
}

export default function BusinessesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterSociety, setFilterSociety] = useState('');

  // Detail drawer state
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ownerData, setOwnerData] = useState<Owner | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [drawerOwnerForm, setDrawerOwnerForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [showDrawerOwnerForm, setShowDrawerOwnerForm] = useState(false);
  const [drawerOwnerSubmitting, setDrawerOwnerSubmitting] = useState(false);
  const [drawerOwnerResult, setDrawerOwnerResult] = useState<OwnerResult | null>(null);
  const [drawerCopied, setDrawerCopied] = useState<'email' | 'password' | ''>('');

  // Create modal state
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<Step>('society');
  const [selectedSocietyId, setSelectedSocietyId] = useState('');
  const [form, setForm] = useState(emptyDetails);
  const [ownerForm, setOwnerForm] = useState(emptyOwner);
  const [skipOwner, setSkipOwner] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdBizId, setCreatedBizId] = useState('');
  const [ownerResult, setOwnerResult] = useState<OwnerResult | null>(null);
  const [copied, setCopied] = useState<'email' | 'password' | ''>('');

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (!loading) loadBusinesses(); }, [filterSociety]);

  const loadData = async () => {
    const [bizRes, socRes] = await Promise.all([api.get('/businesses'), api.get('/societies?limit=100')]);
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

  const openDrawer = async (biz: Business) => {
    setSelectedBiz(biz);
    setOwnerData(null);
    setDrawerOpen(true);
    setShowDrawerOwnerForm(false);
    setDrawerOwnerForm({ firstName: '', lastName: '', email: '', phone: '' });
    setDrawerOwnerResult(null);
    setDrawerCopied('');
    if (biz.ownerId) {
      setOwnerLoading(true);
      const res = await api.get(`/users/${biz.ownerId}`);
      if (res.success) setOwnerData(res.data);
      setOwnerLoading(false);
    }
  };

  const closeDrawer = () => { setDrawerOpen(false); setSelectedBiz(null); setOwnerData(null); setShowDrawerOwnerForm(false); setDrawerOwnerResult(null); };

  const handleDrawerCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiz) return;
    setDrawerOwnerSubmitting(true);
    const res = await api.post('/admin/business-owners', {
      ...drawerOwnerForm,
      societyId: selectedBiz.societyId,
    });
    if (res.success) {
      await api.put(`/businesses/${selectedBiz.id}`, { ownerId: res.data.uid });
      const updated = { ...selectedBiz, ownerId: res.data.uid };
      setSelectedBiz(updated);
      setBusinesses((p) => p.map((b) => b.id === updated.id ? updated : b));
      setDrawerOwnerResult({ email: res.data.email, temporaryPassword: res.data.temporaryPassword });
      setShowDrawerOwnerForm(false);
    }
    setDrawerOwnerSubmitting(false);
  };

  const copyDrawer = (text: string, field: 'email' | 'password') => {
    navigator.clipboard.writeText(text);
    setDrawerCopied(field);
    setTimeout(() => setDrawerCopied(''), 2000);
  };

  const handleVerifyToggle = async () => {
    if (!selectedBiz) return;
    setVerifying(true);
    const res = await api.put(`/businesses/${selectedBiz.id}`, { isVerified: !selectedBiz.isVerified });
    if (res.success) {
      const updated = { ...selectedBiz, isVerified: !selectedBiz.isVerified };
      setSelectedBiz(updated);
      setBusinesses((p) => p.map((b) => b.id === updated.id ? updated : b));
    }
    setVerifying(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleOwnerFormChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setOwnerForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // Step 2 → save business, then go to step 3
  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(''); setSubmitting(true);
    const payload: any = { ...form, societyId: selectedSocietyId };
    if (!payload.email) delete payload.email;
    if (!payload.description) delete payload.description;
    const res = await api.post('/businesses', payload);
    if (res.success) {
      setCreatedBizId(res.data.id);
      setStep('owner');
    } else {
      setFormError(res.error || 'Failed to create business');
    }
    setSubmitting(false);
  };

  // Step 3 → create owner account and link to business
  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(''); setSubmitting(true);
    const res = await api.post('/admin/business-owners', {
      ...ownerForm,
      societyId: selectedSocietyId,
    });
    if (res.success) {
      // Link the owner to the business
      await api.put(`/businesses/${createdBizId}`, { ownerId: res.data.uid });
      setOwnerResult({ email: res.data.email, temporaryPassword: res.data.temporaryPassword });
      setStep('done');
      await loadBusinesses();
    } else {
      setFormError(res.error || 'Failed to create owner account');
    }
    setSubmitting(false);
  };

  const copyToClipboard = (text: string, field: 'email' | 'password') => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this business? This cannot be undone.')) return;
    const res = await api.delete(`/businesses/${id}`);
    if (res.success) {
      setBusinesses((p) => p.filter((b) => b.id !== id));
      if (selectedBiz?.id === id) closeDrawer();
    }
    else alert(res.error || 'Failed to delete');
  };

  const openModal = () => {
    setStep('society');
    setSelectedSocietyId('');
    setForm(emptyDetails);
    setOwnerForm(emptyOwner);
    setSkipOwner(false);
    setFormError('');
    setCreatedBizId('');
    setOwnerResult(null);
    setCopied('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); };

  const selectedSociety = societies.find((s) => s.id === selectedSocietyId);
  const hasSocieties = societies.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
          <p className="text-sm text-gray-500 mt-0.5">{businesses.length} business{businesses.length !== 1 ? 'es' : ''} found</p>
        </div>
        <div className="flex items-center gap-3">
          {hasSocieties && (
            <select
              value={filterSociety}
              onChange={(e) => setFilterSociety(e.target.value)}
              className="field w-auto text-gray-900 bg-white"
            >
              <option value="">All Societies</option>
              {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <button
            onClick={openModal}
            disabled={!hasSocieties}
            title={!hasSocieties ? 'Create a society first before adding a business' : undefined}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Business
          </button>
        </div>
      </div>

      {/* No-society banner */}
      {!loading && !hasSocieties && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-900">No societies yet</p>
              <p className="text-xs text-amber-700 mt-0.5">You must create at least one society before you can add a business.</p>
            </div>
          </div>
          <button onClick={() => router.push('/dashboard/societies')}
            className="shrink-0 px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition">
            Create Society
          </button>
        </div>
      )}

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
          <p className="mt-1 text-sm text-gray-500">
            {hasSocieties ? 'Try a different filter or add a new business.' : 'Create a society first, then add businesses to it.'}
          </p>
          {hasSocieties && (
            <button onClick={openModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
              + New Business
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {businesses.map((biz) => {
            const society = societies.find((s) => s.id === biz.societyId);
            return (
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
              {society && <p className="text-xs text-indigo-500 font-medium">🏘️ {society.name}</p>}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>⭐</span>
                  <span className="font-medium text-gray-700">{biz.rating || 0}</span>
                  <span className="text-gray-400">({biz.totalReviews || 0} reviews)</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openDrawer(biz)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition">
                    View Details
                  </button>
                  <button onClick={() => handleDelete(biz.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium transition">
                    Delete
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Business Detail Drawer */}
      {drawerOpen && selectedBiz && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/40" onClick={closeDrawer} />
          {/* Panel */}
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏪</span>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 leading-tight">{selectedBiz.name}</h2>
                  <p className="text-xs text-gray-500">{selectedBiz.category}</p>
                </div>
              </div>
              <button onClick={closeDrawer} className="text-gray-400 hover:text-gray-600 transition p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 px-6 py-5 space-y-6">
              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  selectedBiz.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {selectedBiz.status}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  selectedBiz.isVerified ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                  {selectedBiz.isVerified ? '✓ Verified' : '⏳ Unverified'}
                </span>
              </div>

              {/* Business Details */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Business Details</h3>
                <dl className="space-y-2.5">
                  <Row label="Name" value={selectedBiz.name} />
                  <Row label="Category" value={selectedBiz.category} />
                  <Row label="Phone" value={selectedBiz.phone} />
                  {selectedBiz.email && <Row label="Email" value={selectedBiz.email} />}
                  <Row label="Address" value={selectedBiz.address} />
                  {selectedBiz.description && <Row label="Description" value={selectedBiz.description} />}
                  <Row label="Rating" value={`${selectedBiz.rating ?? 0} ⭐ (${selectedBiz.totalReviews ?? 0} reviews)`} />
                  {selectedBiz.societyId && (
                    <Row label="Society" value={societies.find((s) => s.id === selectedBiz.societyId)?.name ?? selectedBiz.societyId} />
                  )}
                  {selectedBiz.createdAt && (
                    <Row label="Registered" value={
                      selectedBiz.createdAt._seconds
                        ? new Date(selectedBiz.createdAt._seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                        : String(selectedBiz.createdAt)
                    } />
                  )}
                </dl>
              </section>

              {/* Owner Details */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Business Owner</h3>
                {!selectedBiz.ownerId ? (
                  drawerOwnerResult ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                        <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-sm font-medium text-green-800">Owner account created!</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Email</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-mono text-gray-900 break-all">{drawerOwnerResult.email}</p>
                          <button onClick={() => copyDrawer(drawerOwnerResult!.email, 'email')}
                            className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800">{drawerCopied === 'email' ? '✓ Copied' : 'Copy'}</button>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Temporary Password</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-lg font-bold font-mono tracking-widest text-gray-900">{drawerOwnerResult.temporaryPassword}</p>
                          <button onClick={() => copyDrawer(drawerOwnerResult!.temporaryPassword, 'password')}
                            className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800">{drawerCopied === 'password' ? '✓ Copied' : 'Copy'}</button>
                        </div>
                      </div>
                    </div>
                  ) : showDrawerOwnerForm ? (
                    <form onSubmit={handleDrawerCreateOwner} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                          <input value={drawerOwnerForm.firstName} onChange={(e) => setDrawerOwnerForm((p) => ({ ...p, firstName: e.target.value }))} required placeholder="Raj" className="field" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                          <input value={drawerOwnerForm.lastName} onChange={(e) => setDrawerOwnerForm((p) => ({ ...p, lastName: e.target.value }))} required placeholder="Sharma" className="field" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                        <input type="email" value={drawerOwnerForm.email} onChange={(e) => setDrawerOwnerForm((p) => ({ ...p, email: e.target.value }))} required placeholder="owner@business.com" className="field" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Mobile *</label>
                        <input type="tel" value={drawerOwnerForm.phone} onChange={(e) => setDrawerOwnerForm((p) => ({ ...p, phone: e.target.value }))} required maxLength={10} placeholder="10-digit number" className="field" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => setShowDrawerOwnerForm(false)}
                          className="flex-1 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                        <button type="submit" disabled={drawerOwnerSubmitting}
                          className="flex-1 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
                          {drawerOwnerSubmitting ? 'Creating…' : 'Generate Credentials'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-400 italic">No owner linked.</p>
                      <button onClick={() => setShowDrawerOwnerForm(true)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg transition">
                        + Create Owner Account
                      </button>
                    </div>
                  )
                ) : ownerLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent" />
                    Loading owner…
                  </div>
                ) : ownerData ? (
                  <dl className="space-y-2.5">
                    <Row label="Name" value={`${ownerData.firstName} ${ownerData.lastName}`} />
                    <Row label="Email" value={ownerData.email} />
                    <Row label="Phone" value={ownerData.phone} />
                    <Row label="Account Status" value={ownerData.status} />
                    {ownerData.verificationStatus && (
                      <Row label="Verification" value={ownerData.verificationStatus} />
                    )}
                    {ownerData.createdAt && (
                      <Row label="Joined" value={
                        ownerData.createdAt._seconds
                          ? new Date(ownerData.createdAt._seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                          : String(ownerData.createdAt)
                      } />
                    )}
                  </dl>
                ) : (
                  <p className="text-sm text-red-500">Could not load owner details.</p>
                )}
              </section>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 sticky bottom-0 bg-white">
              <button
                onClick={handleVerifyToggle}
                disabled={verifying}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                  selectedBiz.isVerified
                    ? 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {verifying ? 'Updating…' : selectedBiz.isVerified ? 'Revoke Verification' : 'Mark as Verified'}
              </button>
              <button
                onClick={() => handleDelete(selectedBiz.id)}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition"
              >
                Delete Business
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Business Modal — 3-step */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {step === 'society' && 'Step 1 of 3 — Select Society'}
                  {step === 'details' && 'Step 2 of 3 — Business Details'}
                  {step === 'owner'   && 'Step 3 of 3 — Owner Account'}
                  {step === 'done'    && 'Business Created!'}
                </h2>
                {(step === 'details' || step === 'owner') && selectedSociety && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Society: <span className="font-medium text-indigo-600">{selectedSociety.name}</span>
                    {step === 'details' && (
                      <button onClick={() => setStep('society')} className="ml-2 text-xs text-gray-400 hover:text-gray-600 underline">Change</button>
                    )}
                  </p>
                )}
              </div>
              {step !== 'done' && (
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Step 1 — Society picker */}
            {step === 'society' && (
              <div className="px-6 py-5 space-y-3">
                <p className="text-sm text-gray-500">Choose which society this business belongs to.</p>
                {societies.map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => { setSelectedSocietyId(s.id); setStep('details'); }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 text-left transition ${
                      selectedSocietyId === s.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🏘️</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.city}</p>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
                <div className="flex justify-end pt-2">
                  <button type="button" onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 — Business details */}
            {step === 'details' && (
              <form onSubmit={handleCreateBusiness} className="px-6 py-5 space-y-4">
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
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email <span className="text-gray-400">(optional)</span></label>
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description <span className="text-gray-400">(optional)</span></label>
                  <textarea name="description" value={form.description} onChange={handleFormChange} rows={2}
                    placeholder="What does this business offer?" className="field resize-none" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setStep('society')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                    ← Back
                  </button>
                  <button type="submit" disabled={submitting}
                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                    {submitting ? 'Saving…' : 'Next: Owner Account →'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3 — Owner account */}
            {step === 'owner' && (
              <div className="px-6 py-5 space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{formError}</div>
                )}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-800">
                  ✅ Business created. Now create login credentials for the business owner.
                </div>
                <form onSubmit={handleCreateOwner} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                      <input name="firstName" value={ownerForm.firstName} onChange={handleOwnerFormChange} required
                        placeholder="Raj" className="field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                      <input name="lastName" value={ownerForm.lastName} onChange={handleOwnerFormChange} required
                        placeholder="Sharma" className="field" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
                    <input name="email" type="email" value={ownerForm.email} onChange={handleOwnerFormChange} required
                      placeholder="owner@business.com" className="field" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number *</label>
                    <input name="phone" type="tel" value={ownerForm.phone} onChange={handleOwnerFormChange} required
                      placeholder="10-digit mobile number" maxLength={10} className="field" />
                  </div>
                  <div className="flex justify-between gap-3 pt-2">
                    <button type="button"
                      onClick={async () => { setSkipOwner(true); closeModal(); await loadBusinesses(); }}
                      className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 underline transition">
                      Skip for now
                    </button>
                    <button type="submit" disabled={submitting}
                      className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
                      {submitting ? 'Creating…' : 'Generate Credentials'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 4 — Done: show temp credentials */}
            {step === 'done' && ownerResult && (
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm font-medium text-green-800">Business &amp; owner account created!</p>
                </div>
                <p className="text-xs text-gray-500">Share these credentials securely. The owner will be prompted to change their password on first login.</p>
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
                  <button onClick={closeModal}
                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
