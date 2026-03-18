import { FormEvent, useEffect, useState } from 'react';
import { adminApi } from '../lib/adminApi';

interface AdminMe {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
  twoFactorEnabled?: boolean;
}

export default function AdminAccountPage() {
  const [me, setMe] = useState<AdminMe | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [twoFaSetup, setTwoFaSetup] = useState<{ secret: string; otpauthUrl?: string } | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaPassword, setTwoFaPassword] = useState('');
  const [twoFaSaving, setTwoFaSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', email: '' });
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .get('/auth/me')
      .then((r) => {
        setMe(r.data.data as AdminMe);
        setProfileForm({
          fullName: r.data.data.fullName ?? '',
          email: r.data.data.email ?? '',
        });
      })
      .catch(() => null);
  }, []);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setMessage(null);
    try {
      const res = await adminApi.patch('/auth/profile', profileForm);
      setMe(res.data.data as AdminMe);
      setMessage('Profile updated successfully.');
    } catch (err: any) {
      setMessage(err?.response?.data?.error ?? 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setMessage('New password and confirmation do not match.');
      return;
    }
    setPasswordSaving(true);
    setMessage(null);
    try {
      await adminApi.post('/auth/change-password', {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password changed successfully.');
    } catch (err: any) {
      setMessage(err?.response?.data?.error ?? 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const startTwoFaSetup = async () => {
    setMessage(null);
    try {
      const res = await adminApi.post('/auth/2fa/setup');
      setTwoFaSetup(res.data.data as { secret: string; otpauthUrl?: string });
      setTwoFaCode('');
    } catch (err: any) {
      setMessage(err?.response?.data?.error ?? 'Failed to start 2FA setup');
    }
  };

  const handleEnableTwoFa = async (e: FormEvent) => {
    e.preventDefault();
    if (!twoFaSetup) return;
    setTwoFaSaving(true);
    setMessage(null);
    try {
      await adminApi.post('/auth/2fa/enable', {
        secret: twoFaSetup.secret,
        code: twoFaCode,
      });
      setMe((prev) => (prev ? { ...prev, twoFactorEnabled: true } : prev));
      setTwoFaSetup(null);
      setTwoFaCode('');
      setMessage('Two-factor authentication enabled.');
    } catch (err: any) {
      setMessage(err?.response?.data?.error ?? 'Failed to enable 2FA');
    } finally {
      setTwoFaSaving(false);
    }
  };

  const handleDisableTwoFa = async (e: FormEvent) => {
    e.preventDefault();
    setTwoFaSaving(true);
    setMessage(null);
    try {
      await adminApi.post('/auth/2fa/disable', {
        password: twoFaPassword,
      });
      setMe((prev) => (prev ? { ...prev, twoFactorEnabled: false } : prev));
      setTwoFaPassword('');
      setMessage('Two-factor authentication disabled.');
    } catch (err: any) {
      setMessage(err?.response?.data?.error ?? 'Failed to disable 2FA');
    } finally {
      setTwoFaSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Account & Security</h1>
        <p className="text-sm text-slate-500">Manage your admin profile, password, and 2FA.</p>
      </div>

      {message && (
        <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
          {message}
        </div>
      )}

      <form onSubmit={handleProfileSubmit} className="space-y-3 rounded-xl border border-white/[0.07] bg-[#111118] p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-white">Profile</h2>
          {me && (
            <span className="text-[11px] text-slate-500">
              Role:{' '}
              <span className="font-semibold text-slate-200">
                {me.role}
              </span>
            </span>
          )}
        </div>
        <div className="space-y-1.5 text-sm">
          <label className="block text-slate-300">Full Name</label>
          <input
            value={profileForm.fullName}
            onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
            disabled={me?.role !== 'SUPER_ADMIN'}
            className={`w-full rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500/50 ${
              me?.role !== 'SUPER_ADMIN' ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          />
          {me?.role !== 'SUPER_ADMIN' && (
            <p className="text-[11px] text-slate-500">
              Only Super Admins can change their display name.
            </p>
          )}
        </div>
        <div className="space-y-1.5 text-sm">
          <label className="block text-slate-300">Email</label>
          <input
            value={profileForm.email}
            onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500/50"
          />
        </div>
        <button
          type="submit"
          disabled={profileSaving}
          className="mt-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold px-4 py-2 disabled:opacity-60"
        >
          {profileSaving ? 'Saving...' : 'Save changes'}
        </button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="space-y-3 rounded-xl border border-white/[0.07] bg-[#111118] p-5">
        <h2 className="text-sm font-semibold text-white mb-1">Change Password</h2>
        <div className="space-y-1.5 text-sm">
          <label className="block text-slate-300">Current Password</label>
          <input
            type="password"
            value={pwdForm.currentPassword}
            onChange={(e) => setPwdForm((f) => ({ ...f, currentPassword: e.target.value }))}
            className="w-full rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="space-y-1.5 text-sm">
          <label className="block text-slate-300">New Password</label>
          <input
            type="password"
            value={pwdForm.newPassword}
            onChange={(e) => setPwdForm((f) => ({ ...f, newPassword: e.target.value }))}
            className="w-full rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="space-y-1.5 text-sm">
          <label className="block text-slate-300">Confirm New Password</label>
          <input
            type="password"
            value={pwdForm.confirmPassword}
            onChange={(e) => setPwdForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            className="w-full rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
          />
        </div>
        <button
          type="submit"
          disabled={passwordSaving}
          className="mt-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold px-4 py-2 disabled:opacity-60"
        >
          {passwordSaving ? 'Changing...' : 'Change password'}
        </button>
      </form>

      <div className="space-y-3 rounded-xl border border-white/[0.07] bg-[#111118] p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-white">Two-Factor Authentication (2FA)</h2>
          <span
            className={`text-xs font-medium ${
              me?.twoFactorEnabled ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            {me?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {!me?.twoFactorEnabled && !twoFaSetup && (
          <button
            type="button"
            onClick={startTwoFaSetup}
            className="mt-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold px-3 py-1.5"
          >
            Start 2FA setup
          </button>
        )}

        {!me?.twoFactorEnabled && twoFaSetup && (
          <form onSubmit={handleEnableTwoFa} className="space-y-2 text-xs mt-2">
            <p className="text-slate-300">
              Scan this secret in your authenticator app, then enter the 6‑digit code.
            </p>
            {twoFaSetup.otpauthUrl && (
              <p className="text-[11px] text-slate-500 break-all">
                otpauth URL: {twoFaSetup.otpauthUrl}
              </p>
            )}
            <p className="text-[11px] text-slate-500 break-all">
              Secret: <span className="font-mono">{twoFaSetup.secret}</span>
            </p>
            <div className="space-y-1.5">
              <label className="block text-slate-300">Authentication code</label>
              <input
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
                placeholder="123456"
              />
            </div>
            <button
              type="submit"
              disabled={twoFaSaving}
              className="mt-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold px-3 py-1.5 disabled:opacity-60"
            >
              {twoFaSaving ? 'Enabling...' : 'Enable 2FA'}
            </button>
          </form>
        )}

        {me?.twoFactorEnabled && (
          <form onSubmit={handleDisableTwoFa} className="space-y-2 text-xs mt-2">
            <p className="text-slate-300">
              To disable 2FA, confirm your current password.
            </p>
            <div className="space-y-1.5">
              <label className="block text-slate-300">Password</label>
              <input
                type="password"
                value={twoFaPassword}
                onChange={(e) => setTwoFaPassword(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={twoFaSaving}
              className="mt-1 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-60"
            >
              {twoFaSaving ? 'Disabling...' : 'Disable 2FA'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

