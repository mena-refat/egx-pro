import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { useAdminStore } from '../store/adminAuthStore';

interface AdminMe {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
  twoFactorEnabled?: boolean;
}

export default function AdminAccountPage() {
  const { t } = useTranslation();
  const setAuth    = useAdminStore((s) => s.setAuth);
  const storeToken = useAdminStore((s) => s.token);
  const storeAdmin = useAdminStore((s) => s.admin);
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
      setMessage(t('account.profileUpdated'));
    } catch (err: any) {
      setMessage(err?.response?.data?.error ?? 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setMessage(t('account.passwordsMismatch'));
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
      setMessage(t('account.passwordChanged'));
      // Clear mustChangePassword flag from store
      if (storeToken && storeAdmin) {
        setAuth(storeToken, { ...storeAdmin, mustChangePassword: false });
      }
    } catch (err: any) {
      const code = err?.response?.data?.error;
      setMessage(code === 'PASSWORD_TOO_WEAK' ? t('account.passwordTooWeak') : (err?.response?.data?.error ?? 'Failed to change password'));
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
      setMessage(t('account.twoFaEnabled'));
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
      setMessage(t('account.twoFaDisabled'));
    } catch (err: any) {
      setMessage(err?.response?.data?.error ?? 'Failed to disable 2FA');
    } finally {
      setTwoFaSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">{t('account.title')}</h1>
        <p className="text-sm text-slate-500">{t('account.subtitle')}</p>
      </div>

      {message && (
        <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
          {message}
        </div>
      )}

      {me?.role === 'SUPER_ADMIN' ? (
        <form onSubmit={handleProfileSubmit} className="space-y-3 rounded-xl border border-white/[0.07] bg-[#111118] p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-white">{t('account.profile')}</h2>
            <span className="text-[11px] text-slate-500">
              {t('account.role')}:{' '}
              <span className="font-semibold text-amber-400">{me.role}</span>
            </span>
          </div>
          <div className="space-y-1.5 text-sm">
            <label className="block text-slate-300">{t('account.fullName')}</label>
            <input
              value={profileForm.fullName}
              onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="space-y-1.5 text-sm">
            <label className="block text-slate-300">{t('account.email')}</label>
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
            {profileSaving ? t('common.saving') : t('account.saveChanges')}
          </button>
        </form>
      ) : (
        <div className="rounded-xl border border-white/[0.07] bg-[#111118] p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-white">{t('account.profile')}</h2>
            <span className="text-[11px] text-slate-500">
              {t('account.role')}:{' '}
              <span className="font-semibold text-slate-200">{me?.role ?? '—'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">{t('account.superAdminOnly')}</p>
          <div className="mt-3 space-y-1.5">
            <p className="text-xs text-slate-500">{t('account.fullName')}: <span className="text-slate-300">{me?.fullName}</span></p>
            <p className="text-xs text-slate-500">{t('account.email')}: <span className="text-slate-300">{me?.email}</span></p>
          </div>
        </div>
      )}

      <form onSubmit={handlePasswordSubmit} className="space-y-3 rounded-xl border border-white/[0.07] bg-[#111118] p-5">
        <h2 className="text-sm font-semibold text-white mb-1">{t('account.changePassword')}</h2>
        <div className="space-y-1.5 text-sm">
          <label className="block text-slate-300">{t('account.currentPassword')}</label>
          <input
            type="password"
            value={pwdForm.currentPassword}
            onChange={(e) => setPwdForm((f) => ({ ...f, currentPassword: e.target.value }))}
            className="w-full rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="space-y-1.5 text-sm">
          <label className="block text-slate-300">{t('account.newPassword')}</label>
          <input
            type="password"
            value={pwdForm.newPassword}
            onChange={(e) => setPwdForm((f) => ({ ...f, newPassword: e.target.value }))}
            className="w-full rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="space-y-1.5 text-sm">
          <label className="block text-slate-300">{t('account.confirmPassword')}</label>
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
          {passwordSaving ? t('common.changing') : t('account.changePassword')}
        </button>
      </form>

      <div className="space-y-3 rounded-xl border border-white/[0.07] bg-[#111118] p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-white">{t('account.twoFa')}</h2>
          <span className={`text-xs font-medium ${me?.twoFactorEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
            {me?.twoFactorEnabled ? t('account.enabled') : t('account.disabled')}
          </span>
        </div>

        {!me?.twoFactorEnabled && !twoFaSetup && (
          <button
            type="button"
            onClick={startTwoFaSetup}
            className="mt-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold px-3 py-1.5"
          >
            {t('account.start2fa')}
          </button>
        )}

        {!me?.twoFactorEnabled && twoFaSetup && (
          <form onSubmit={handleEnableTwoFa} className="space-y-2 text-xs mt-2">
            <p className="text-slate-300">{t('account.scanSecret')}</p>
            {twoFaSetup.otpauthUrl && (
              <p className="text-[11px] text-slate-500 break-all">
                {t('account.otpUrl')}: {twoFaSetup.otpauthUrl}
              </p>
            )}
            <p className="text-[11px] text-slate-500 break-all">
              {t('account.secretLabel')}: <span className="font-mono">{twoFaSetup.secret}</span>
            </p>
            <div className="space-y-1.5">
              <label className="block text-slate-300">{t('account.authCode')}</label>
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
              {twoFaSaving ? t('common.enabling') : t('account.enable2fa')}
            </button>
          </form>
        )}

        {me?.twoFactorEnabled && (
          me?.mustSetup2FA ? (
            <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mt-2">
              {t('account.twoFaEnforced')}
            </p>
          ) : (
            <form onSubmit={handleDisableTwoFa} className="space-y-2 text-xs mt-2">
              <p className="text-slate-300">{t('account.disable2faDesc')}</p>
              <div className="space-y-1.5">
                <label className="block text-slate-300">{t('account.passwordLabel')}</label>
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
                {twoFaSaving ? t('common.disabling') : t('account.disable2fa')}
              </button>
            </form>
          )
        )}
      </div>
    </div>
  );
}
