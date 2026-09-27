'use client';

import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/api';
import api from '@/lib/api';

interface PlatformConfig {
  platformFeeAmount: number;
  minimumOrderAmount: number;
  adsEnabled: boolean;
  adsNativeFeedEnabled: boolean;
  adsNativeListingEnabled: boolean;
  adsRewardedEnabled: boolean;
  adsRewardedMinRs: number;
  adsRewardedMaxRs: number;
  adsDensityEveryNthCard: number;
  adsRewardedMaxClaimsPerDay: number;
  homeBannersEnabled: boolean;
}

const DEFAULT_CONFIG: PlatformConfig = {
  platformFeeAmount: 2,
  minimumOrderAmount: 50,
  adsEnabled: false,
  adsNativeFeedEnabled: false,
  adsNativeListingEnabled: false,
  adsRewardedEnabled: false,
  adsRewardedMinRs: 2,
  adsRewardedMaxRs: 5,
  adsDensityEveryNthCard: 4,
  adsRewardedMaxClaimsPerDay: 1,
  homeBannersEnabled: true,
};

function Toggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function NumberField({ label, description, value, onChange, min, max, step, unit }: {
  label: string; description: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; unit?: string;
}) {
  return (
    <div className="py-3">
      <label className="block text-sm font-medium text-gray-900">{label}</label>
      <p className="text-xs text-gray-500 mt-0.5 mb-2">{description}</p>
      <div className="flex items-center gap-2">
        {unit && <span className="text-sm text-gray-500 font-medium">{unit}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step ?? 1}
          className="w-28 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<{ email: string | null; id: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const [config, setConfig] = useState<PlatformConfig>(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (u) setUser({ email: u.email, id: u.id });
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setConfigLoading(true);
      const res = await api.get('/admin/platform-config');
      if (res.success && res.data) {
        setConfig({ ...DEFAULT_CONFIG, ...res.data });
      }
    } catch {
      // Use defaults
    } finally {
      setConfigLoading(false);
    }
  };

  const saveConfig = async () => {
    setConfigSaving(true);
    setConfigMessage(null);
    try {
      const res = await api.put('/admin/platform-config', config);
      if (res.success) {
        setConfigMessage({ type: 'success', text: 'Settings saved. Changes are live immediately.' });
        if (res.data) setConfig({ ...DEFAULT_CONFIG, ...res.data });
      } else {
        setConfigMessage({ type: 'error', text: res.error || 'Failed to save' });
      }
    } catch (err: any) {
      setConfigMessage({ type: 'error', text: err?.message ?? 'Failed to save settings' });
    } finally {
      setConfigSaving(false);
    }
  };

  const updateConfig = <K extends keyof PlatformConfig>(key: K, value: PlatformConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setConfigMessage(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setPwLoading(true);
    try {
      const res = await api.post('/auth/change-password', { newPassword });
      if (res.success) {
        setPwSuccess('Password updated successfully');
        setNewPassword(''); setConfirmPassword('');
      } else {
        setPwError(res.error || 'Failed to update password');
      }
    } catch (err: any) {
      setPwError(err?.message ?? 'Failed to update password');
    }
    setPwLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage platform configuration, ads, and account security</p>
      </div>

      {/* Platform Fees */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Platform Fees & Order Rules</h2>
            <p className="text-xs text-gray-500">Applied to every order at checkout</p>
          </div>
        </div>
        <div className="px-6 py-2 divide-y divide-gray-100">
          {configLoading ? (
            <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
          ) : (
            <>
              <NumberField
                label="Platform Fee"
                description="Fixed fee added to every order (in ₹)"
                value={config.platformFeeAmount}
                onChange={(v) => updateConfig('platformFeeAmount', v)}
                min={0}
                max={100}
                unit="₹"
              />
              <NumberField
                label="Minimum Order Amount"
                description="Orders below this amount are blocked at checkout"
                value={config.minimumOrderAmount}
                onChange={(v) => updateConfig('minimumOrderAmount', v)}
                min={0}
                max={1000}
                unit="₹"
              />
            </>
          )}
        </div>
      </div>

      {/* Ads Configuration */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Ad Settings</h2>
            <p className="text-xs text-gray-500">Control ads across the mobile app — changes go live instantly</p>
          </div>
        </div>
        <div className="px-6 py-2 divide-y divide-gray-100">
          {configLoading ? (
            <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
          ) : (
            <>
              <Toggle
                label="Ads Master Switch"
                description="Kill switch for all ads. When off, no ads show anywhere."
                checked={config.adsEnabled}
                onChange={(v) => updateConfig('adsEnabled', v)}
              />

              <div className={config.adsEnabled ? '' : 'opacity-40 pointer-events-none'}>
                <div className="pt-3 pb-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Native Ads</p>
                </div>
                <Toggle
                  label="Feed Ads (Home & Stores)"
                  description="Show native ads between store cards in the home feed and stores list"
                  checked={config.adsNativeFeedEnabled}
                  onChange={(v) => updateConfig('adsNativeFeedEnabled', v)}
                />
                <Toggle
                  label="Listing Ads (Product List)"
                  description="Show a native ad at the bottom of a shop's product list"
                  checked={config.adsNativeListingEnabled}
                  onChange={(v) => updateConfig('adsNativeListingEnabled', v)}
                />
                <NumberField
                  label="Ad Density"
                  description="Show one native ad every N store cards (e.g. 4 = after every 4th card)"
                  value={config.adsDensityEveryNthCard}
                  onChange={(v) => updateConfig('adsDensityEveryNthCard', v)}
                  min={2}
                  max={20}
                />

                <div className="pt-3 pb-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rewarded Video Ads</p>
                </div>
                <Toggle
                  label="Rewarded Videos"
                  description="Let customers watch a video at checkout to earn a discount coupon"
                  checked={config.adsRewardedEnabled}
                  onChange={(v) => updateConfig('adsRewardedEnabled', v)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    label="Min Reward"
                    description="Minimum discount amount"
                    value={config.adsRewardedMinRs}
                    onChange={(v) => updateConfig('adsRewardedMinRs', v)}
                    min={1}
                    max={50}
                    unit="₹"
                  />
                  <NumberField
                    label="Max Reward"
                    description="Maximum discount amount"
                    value={config.adsRewardedMaxRs}
                    onChange={(v) => updateConfig('adsRewardedMaxRs', v)}
                    min={1}
                    max={100}
                    unit="₹"
                  />
                </div>
                <NumberField
                  label="Daily Claim Limit"
                  description="Max rewarded video claims per user per day"
                  value={config.adsRewardedMaxClaimsPerDay}
                  onChange={(v) => updateConfig('adsRewardedMaxClaimsPerDay', v)}
                  min={1}
                  max={10}
                />
              </div>

              <div className="pt-3 pb-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Home Banners</p>
              </div>
              <Toggle
                label="Dynamic Home Banners"
                description="Show admin-managed promotional banners on the home screen carousel"
                checked={config.homeBannersEnabled}
                onChange={(v) => updateConfig('homeBannersEnabled', v)}
              />
            </>
          )}
        </div>

        {/* Save button */}
        {!configLoading && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <div>
              {configMessage && (
                <p className={`text-sm font-medium ${configMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {configMessage.text}
                </p>
              )}
            </div>
            <button
              onClick={saveConfig}
              disabled={configSaving}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {configSaving ? 'Saving…' : 'Save All Settings'}
            </button>
          </div>
        )}
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Account Information</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email Address</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono">
                {user?.email || '—'}
              </div>
              <span className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">Super Admin</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">User ID</label>
            <p className="text-xs text-gray-400 font-mono break-all bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">{user?.id || '—'}</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Change Password</h2>
          <p className="text-xs text-gray-500 mt-0.5">Update your admin account password</p>
        </div>
        <form onSubmit={handleChangePassword} className="px-6 py-5 space-y-4">
          {pwError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">{pwError}</div>
          )}
          {pwSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-sm text-emerald-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {pwSuccess}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Min. 8 characters"
                className="field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repeat new password"
                className="field"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={pwLoading}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* API Info */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">API Configuration</h2>
        </div>
        <div className="px-6 py-5">
          <label className="block text-xs font-medium text-gray-500 mb-1">Base URL</label>
          <p className="text-xs text-gray-500 font-mono break-all bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            {process.env.NEXT_PUBLIC_API_BASE_URL || '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
