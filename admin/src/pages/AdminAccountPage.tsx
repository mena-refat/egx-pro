import { FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { useAdminStore } from '../store/adminAuthStore';
import { Eye, EyeOff, Copy, Check, Shield, Smartphone, KeyRound } from 'lucide-react';
import * as QRCode from 'qrcode';

interface AdminMe {
  id: number;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
  twoFactorEnabled?: boolean;
  mustSetup2FA?: boolean;
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

  // Eye toggle states
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [showTwoFaPwd, setShowTwoFaPwd] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Validation error states
  const [profileEmailError, setProfileEmailError] = useState('');
  const [profileFullNameError, setProfileFullNameError] = useState('');
  const [newPwdError, setNewPwdError] = useState('');

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

  useEffect(() => {
    if (twoFaSetup?.otpauthUrl) {
      QRCode.toDataURL(twoFaSetup.otpauthUrl, { width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null));
    } else {
      setQrDataUrl(null);
    }
  }, [twoFaSetup]);

  const copySecret = () => {
    if (!twoFaSetup?.secret) return;
    navigator.clipboard.writeText(twoFaSetup.secret).then(() => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  const validateEmail = (value: string) => {
    if (!value.includes('@') || !value.includes('.')) {
      return 'Invalid email address';
    }
    return '';
  };

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Run validations before submit
    const emailErr = validateEmail(profileForm.email);
    const nameErr = !profileForm.fullName.trim() ? 'Full name is required' : '';
    setProfileEmailError(emailErr);
    setProfileFullNameError(nameErr);
    if (emailErr || nameErr) return;

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

      {me?.role === 'SUPER_ADMIN' && (
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
              onChange={(e) => { setProfileForm((f) => ({ ...f, fullName: e.target.value })); setProfileFullNameError(''); }}
              onBlur={() => { if (!profileForm.fullName.trim()) setProfileFullNameError('Full name is required'); }}
              className={`w-full rounded-lg border bg-[#0d0d14] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500/50 ${profileFullNameError ? 'border-red-500/50' : 'border-white/[0.08]'}`}
            />
            {profileFullNameError && <p className="text-xs text-red-400 mt-1">{profileFullNameError}</p>}
          </div>
          <div className="space-y-1.5 text-sm">
            <label className="block text-slate-300">{t('account.email')}</label>
            <input
              value={profileForm.email}
              onChange={(e) => { setProfileForm((f) => ({ ...f, email: e.target.value })); setProfileEmailError(''); }}
              onBlur={() => setProfileEmailError(validateEmail(profileForm.email))}
              className={`w-full rounded-lg border bg-[#0d0d14] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500/50 ${profileEmailError ? 'border-red-500/50' : 'border-white/[0.08]'}`}
            />
            {profileEmailError && <p className="text-xs text-red-400 mt-1">{profileEmailError}</p>}
          </div>
          <button
            type="submit"
            disabled={profileSaving}
            className="mt-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold px-4 py-2 disabled:opacity-60"
          >
            {profileSaving ? t('common.saving') : t('account.saveChanges')}
          </button>
        </form>
      )}

      <form onSubmit={handlePasswordSubmit} className="space-y-3 rounded-xl border border-white/[0.07] bg-[#111118] p-5">
        <h2 className="text-sm font-semibold text-white mb-1">{t('account.changePassword')}</h2>
        <div className="space-y-1.5 text-sm">
          <label className="block text-slate-300">{t('account.currentPassword')}</label>
          <div className="relative">
            <input
              type={showCurrentPwd ? 'text' : 'password'}
              value={pwdForm.currentPassword}
              onChange={(e) => setPwdForm((f) => ({ ...f, currentPassword: e.target.value }))}
              className="w-full pr-9 rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPwd((v) => !v)}
              className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-500 hover:text-slate-300 transition-colors"
              tabIndex={-1}
            >
              {showCurrentPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5 text-sm">
          <label className="block text-slate-300">{t('account.newPassword')}</label>
          <div className="relative">
            <input
              type={showNewPwd ? 'text' : 'password'}
              value={pwdForm.newPassword}
              onChange={(e) => { setPwdForm((f) => ({ ...f, newPassword: e.target.value })); setNewPwdError(''); }}
              onBlur={() => {
                if (pwdForm.newPassword && pwdForm.newPassword.length < 18) {
                  setNewPwdError('Password must be at least 18 characters');
                }
              }}
              className={`w-full pr-9 rounded-lg border bg-[#0d0d14] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50 ${newPwdError ? 'border-red-500/50' : 'border-white/[0.08]'}`}
            />
            <button
              type="button"
              onClick={() => setShowNewPwd((v) => !v)}
              className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-500 hover:text-slate-300 transition-colors"
              tabIndex={-1}
            >
              {showNewPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {newPwdError && <p className="text-xs text-red-400 mt-1">{newPwdError}</p>}
        </div>
        <div className="space-y-1.5 text-sm">
          <label className="block text-slate-300">{t('account.confirmPassword')}</label>
          <div className="relative">
            <input
              type={showConfirmPwd ? 'text' : 'password'}
              value={pwdForm.confirmPassword}
              onChange={(e) => setPwdForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              className="w-full pr-9 rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPwd((v) => !v)}
              className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-500 hover:text-slate-300 transition-colors"
              tabIndex={-1}
            >
              {showConfirmPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
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
          <form onSubmit={handleEnableTwoFa} className="mt-4 space-y-5">
            {/* Step 1 */}
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center justify-center">1</span>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Smartphone size={12} className="text-emerald-400" />
                  <p className="text-xs font-medium text-white">Authenticator App</p>
                </div>
                <p className="text-[11px] text-slate-400">{t('account.step1Desc')}</p>
              </div>
            </div>

            {/* Step 2 – QR Code */}
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center justify-center">2</span>
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-1.5">
                  <Shield size={12} className="text-emerald-400" />
                  <p className="text-xs font-medium text-white">Scan QR Code</p>
                </div>
                <p className="text-[11px] text-slate-400">{t('account.step2Desc')}</p>
                {qrDataUrl ? (
                  <div className="flex justify-center">
                    <div className="bg-white p-3 rounded-xl shadow-lg shadow-black/40 inline-block">
                      <img src={qrDataUrl} alt="2FA QR Code" className="w-44 h-44 block" />
                    </div>
                  </div>
                ) : (
                  <div className="w-44 h-44 mx-auto rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-slate-600 text-xs">
                    Generating...
                  </div>
                )}

                {/* Manual entry */}
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <KeyRound size={10} className="text-slate-500" />
                    <p className="text-[10px] text-slate-500">{t('account.manualEntry')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-200 flex-1 break-all tracking-wider">
                      {twoFaSetup.secret}
                    </span>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="flex-shrink-0 flex items-center gap-1 rounded-md bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] px-2 py-1 text-[10px] font-medium text-slate-300 transition-colors"
                    >
                      {copied ? (
                        <><Check size={10} className="text-emerald-400" /> {t('account.copied')}</>
                      ) : (
                        <><Copy size={10} /> {t('account.copySecret')}</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 – Enter code */}
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center justify-center">3</span>
              <div className="flex-1 space-y-2">
                <p className="text-xs font-medium text-white">{t('account.step3Desc')}</p>
                <input
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2.5 text-base text-white outline-none focus:border-emerald-500/50 font-mono tracking-[0.4em] text-center"
                  placeholder="• • • • • •"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={twoFaSaving || twoFaCode.length < 6}
              className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold px-4 py-2.5 disabled:opacity-50 transition-colors"
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
                <div className="relative">
                  <input
                    type={showTwoFaPwd ? 'text' : 'password'}
                    value={twoFaPassword}
                    onChange={(e) => setTwoFaPassword(e.target.value)}
                    className="w-full pr-9 rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTwoFaPwd((v) => !v)}
                    className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showTwoFaPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
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
