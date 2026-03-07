import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Shield,
  ShieldCheck,
  ShieldOff,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  X,
  Loader2,
  Smartphone,
  Tablet,
  Monitor,
  Copy,
} from 'lucide-react';
import { validateChangePassword } from '../../../lib/validations';
import { OTPInput } from '../../ui/OTPInput';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import type { ProfileTabProps } from './types';

function formatLastActivity(
  createdAt: string,
  t: (key: string, opts?: Record<string, number>) => string
): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return t('settings.lastActivityMoments');
  if (mins < 60) return t('settings.lastActivityMinutes', { m: mins });
  if (hours < 24) return t('settings.lastActivityHours', { h: hours });
  return t('settings.lastActivityDays', { d: days });
}

function sessionDeviceLabel(
  s: { deviceType?: string; browser?: string; os?: string; deviceInfo?: string },
  t: (key: string) => string
): string {
  const browser = s.browser || 'Unknown';
  const os = s.os || 'Unknown';
  const on = t('settings.sessionOn');
  if (browser && os) return `${browser} ${on} ${os}`;
  if (s.deviceInfo && s.deviceInfo.length < 80) return s.deviceInfo;
  return `${browser} ${on} ${os}`;
}

export function SecurityTab({ user, accessToken, onUpdateProfile, setRequestStatus }: ProfileTabProps) {
  const { t, i18n } = useTranslation('common');
  const [lastPasswordChangeAt, setLastPasswordChangeAt] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(Boolean(user.twoFactorEnabled));
  const [twoFactorEnabledAt, setTwoFactorEnabledAt] = useState<string | null>(user.twoFactorEnabledAt ?? null);
  const [enable2FAModalOpen, setEnable2FAModalOpen] = useState(false);
  const [enable2FAStep, setEnable2FAStep] = useState<1 | 2 | 3 | 'success'>(1);
  const [setupData, setSetupData] = useState<{ qrCodeUrl: string; manualCode: string } | null>(null);
  const [enable2FAOtp, setEnable2FAOtp] = useState('');
  const [enable2FAError, setEnable2FAError] = useState<string | null>(null);
  const [enable2FALoading, setEnable2FALoading] = useState(false);
  const [disable2FAModalOpen, setDisable2FAModalOpen] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');
  const [disable2FAOtp, setDisable2FAOtp] = useState('');
  const [disable2FAError, setDisable2FAError] = useState<string | null>(null);
  const [disable2FALoading, setDisable2FALoading] = useState(false);

  const [sessions, setSessions] = useState<Array<{
    id: string;
    deviceType?: string;
    browser?: string;
    os?: string;
    deviceInfo?: string;
    city?: string;
    country?: string;
    createdAt: string;
    isCurrentSession?: boolean;
  }>>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeAllOtherLoading, setRevokeAllOtherLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    const run = async () => {
      try {
        const res = await fetch('/api/user/security', { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = await res.json();
        if (res.ok) {
          setLastPasswordChangeAt(data.lastPasswordChangeAt ?? null);
          setTwoFactorEnabled(Boolean(data.twoFactorEnabled));
          setTwoFactorEnabledAt(data.twoFactorEnabledAt ?? null);
        }
      } catch {
        // ignore
      }
    };
    run();
  }, [accessToken]);

  const fetchSessions = useCallback(async () => {
    if (!accessToken) return;
    setSessionsLoading(true);
    try {
      let list: Array<{ id: string; deviceType?: string; browser?: string; os?: string; deviceInfo?: string; city?: string; country?: string; createdAt: string; isCurrentSession?: boolean }> = [];
      const authRes = await fetch('/api/auth/sessions', { credentials: 'include' });
      if (authRes.ok) {
        const data = await authRes.json();
        if (Array.isArray(data)) list = data;
      }
      if (list.length === 0) {
        const userRes = await fetch('/api/user/sessions', { headers: { Authorization: `Bearer ${accessToken}` } });
        if (userRes.ok) {
          const data = await userRes.json();
          if (Array.isArray(data)) list = data;
        }
      }
      setSessions(list.map((s: { id: string; deviceType?: string; browser?: string; os?: string; deviceInfo?: string; city?: string; country?: string; createdAt: string; isCurrentSession?: boolean }) => ({
        id: s.id,
        deviceType: s.deviceType,
        browser: s.browser,
        os: s.os,
        deviceInfo: s.deviceInfo,
        city: s.city,
        country: s.country,
        createdAt: s.createdAt,
        isCurrentSession: s.isCurrentSession ?? false,
      })));
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleChangePassword = async () => {
    if (!accessToken) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage(t('settings.fillAllFields'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage(t('settings.passwordsNoMatch'));
      return;
    }
    const pwCheck = validateChangePassword(newPassword, { email: user.email ?? undefined, username: user.username ?? undefined });
    if (!pwCheck.ok) {
      setPasswordMessage((pwCheck as { ok: false; message: string }).message);
      return;
    }
    setChangingPassword(true);
    setPasswordMessage(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setPasswordMessage(t('settings.update'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      setLastPasswordChangeAt(new Date().toISOString());
    } catch (err) {
      setPasswordMessage((err as Error).message || t('settings.changePasswordFailed'));
    } finally {
      setChangingPassword(false);
    }
  };

  const openEnable2FAModal = () => {
    setEnable2FAModalOpen(true);
    setEnable2FAStep(1);
    setSetupData(null);
    setEnable2FAOtp('');
    setEnable2FAError(null);
  };

  const fetch2FASetup = async () => {
    if (!accessToken) return;
    setEnable2FALoading(true);
    setEnable2FAError(null);
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === '2fa_already_enabled') setEnable2FAError(t('settings.twoFaAlreadyEnabled'));
        else setEnable2FAError(t('settings.twoFaSetupFailed'));
        return;
      }
      setSetupData({ qrCodeUrl: data.qrCodeUrl, manualCode: data.manualCode });
      setEnable2FAStep(2);
    } catch {
      setEnable2FAError(t('settings.twoFaSetupFailed'));
    } finally {
      setEnable2FALoading(false);
    }
  };

  const submitEnable2FA = async (code: string) => {
    if (!accessToken) return;
    const cleanCode = code.toString().replace(/\s/g, '');
    if (cleanCode.length !== 6) {
      setEnable2FAError(t('settings.enterFullCode'));
      return;
    }
    if (!/^\d{6}$/.test(cleanCode)) {
      setEnable2FAError(t('settings.codeMustBe6Digits'));
      return;
    }
    setEnable2FALoading(true);
    setEnable2FAError(null);
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ code: cleanCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === 'invalid_code') setEnable2FAError(t('settings.invalidCodeLong'));
        else if (data?.error === 'no_secret') setEnable2FAError(t('settings.noSecret'));
        else if (data?.error === '2fa_already_enabled') setEnable2FAError(t('settings.twoFaAlreadyEnabled'));
        else setEnable2FAError(data?.message || t('settings.twoFaInvalidCodeTryAgain'));
        return;
      }
      setTwoFactorEnabled(true);
      setEnable2FAStep('success');
      const secRes = await fetch('/api/user/security', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (secRes.ok) {
        const sec = await secRes.json();
        setTwoFactorEnabledAt(sec.twoFactorEnabledAt ?? null);
      }
    } catch {
      setEnable2FAError(t('settings.twoFaSetupFailed'));
    } finally {
      setEnable2FALoading(false);
    }
  };

  const submitDisable2FA = async () => {
    if (!accessToken || !disable2FAPassword || disable2FAOtp.length !== 6) return;
    setDisable2FALoading(true);
    setDisable2FAError(null);
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ code: disable2FAOtp, password: disable2FAPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === 'wrong_password') setDisable2FAError(t('settings.wrongPassword'));
        else if (data?.error === 'invalid_code') setDisable2FAError(t('settings.invalidCode'));
        else setDisable2FAError(data?.error || 'Failed');
        return;
      }
      setTwoFactorEnabled(false);
      setTwoFactorEnabledAt(null);
      setDisable2FAModalOpen(false);
      setDisable2FAPassword('');
      setDisable2FAOtp('');
    } catch {
      setDisable2FAError(t('settings.twoFaSetupFailed'));
    } finally {
      setDisable2FALoading(false);
    }
  };

  const endSession = async (id: string) => {
    if (!accessToken) return;
    setRevokingId(id);
    try {
      await fetch(`/api/user/sessions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
      await fetchSessions();
    } finally {
      setRevokingId(null);
    }
  };

  const revokeAllOther = async () => {
    if (!accessToken) return;
    setRevokeAllOtherLoading(true);
    try {
      await fetch('/api/user/sessions/revoke-all-other', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
      await fetchSessions();
      setRequestStatus({ type: 'success', message: t('settings.sessionsEnded') });
    } catch {
      setRequestStatus({ type: 'error', message: t('settings.endSessionsFailed') });
    } finally {
      setRevokeAllOtherLoading(false);
    }
  };

  const inputBase = 'w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none transition-colors';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-[var(--text-muted)]" />
          {t('settings.securityPrivacy')}
        </h3>

        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">{t('settings.password')}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordForm((v) => !v)}
                className="text-sm font-medium text-[var(--brand-text)] hover:underline"
              >
                {showPasswordForm ? t('common.cancel') : `${t('settings.change')} ←`}
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {t('settings.lastChange')}: {lastPasswordChangeAt ? new Date(lastPasswordChangeAt).toLocaleDateString(i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : t('settings.passwordNeverChanged')}
            </p>
            <AnimatePresence>
              {showPasswordForm && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="mt-4 space-y-3 pt-2">
                    <div className="relative">
                      <Input type={showCurrentPw ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t('settings.currentPassword')} inputClassName="pe-10" />
                      <button type="button" onClick={() => setShowCurrentPw((v) => !v)} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                        {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="relative">
                      <Input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('settings.newPassword')} inputClassName="pe-10" />
                      <button type="button" onClick={() => setShowNewPw((v) => !v)} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('settings.confirmPassword')} />
                    <div className="flex gap-2">
                      <Button type="button" variant="primary" onClick={handleChangePassword} disabled={changingPassword} loading={changingPassword}>
                        {t('settings.update')}
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setShowPasswordForm(false)}>
                        {t('common.cancel')}
                      </Button>
                    </div>
                    {passwordMessage && <p className="text-xs text-[var(--text-muted)]">{passwordMessage}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                {twoFactorEnabled ? <ShieldCheck className="w-4 h-4 text-[var(--success)]" /> : <Shield className="w-4 h-4 text-[var(--text-muted)]" />}
                {t('settings.twoFa')}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {twoFactorEnabled && twoFactorEnabledAt
                  ? t('settings.twoFaEnabledSince', { date: new Date(twoFactorEnabledAt).toLocaleDateString(i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) })
                  : t('settings.twoFaDesc')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {twoFactorEnabled ? (
                <>
                  <span className="text-xs px-2 py-1 rounded-full bg-[var(--success-bg)] text-[var(--success)]">● {t('settings.enabled')}</span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setDisable2FAModalOpen(true); setDisable2FAError(null); setDisable2FAPassword(''); setDisable2FAOtp(''); }}>
                    {t('settings.twoFaDisableConfirm')}
                  </Button>
                </>
              ) : (
                <Button type="button" variant="primary" size="sm" onClick={openEnable2FAModal}>
                  {t('settings.enable')}
                </Button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
              {t('settings.sessions')}
              {sessions.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-muted)]">{sessions.length}</span>}
            </p>
            {sessionsLoading ? (
              <p className="text-xs text-[var(--text-muted)]">{t('common.loading')}</p>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">{t('settings.noOtherSessions')}</p>
            ) : (
              <ul className="space-y-0 rounded-xl border border-[var(--border)] overflow-hidden divide-y divide-[var(--border-subtle)]">
                {sessions.map((s) => {
                  const dt = (s.deviceType || '').toLowerCase();
                  const DeviceIcon = dt === 'mobile' ? Smartphone : dt === 'tablet' ? Tablet : Monitor;
                  const label = sessionDeviceLabel(s, t);
                  const lastActivity = formatLastActivity(s.createdAt, t);
                  const location = [s.city, s.country].filter(Boolean).join(' · ') || null;
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-card)]">
                      <div className="flex items-center gap-3 min-w-0">
                        <DeviceIcon className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                            {s.isCurrentSession ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-[var(--brand-subtle)] text-[var(--brand-text)]">{t('settings.youAreHere')}</span>
                            ) : (
                              <button type="button" onClick={() => endSession(s.id)} disabled={revokingId === s.id} className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)]">
                                {revokingId === s.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : t('settings.endSession')}
                              </button>
                            )}
                          </div>
                          {location && <p className="text-xs text-[var(--text-muted)] mt-0.5">{location}</p>}
                          <p className="text-xs text-[var(--text-muted)]">{lastActivity}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {sessions.length > 1 && (
              <Button type="button" variant="ghost" size="sm" className="mt-3 text-[var(--danger)]" onClick={revokeAllOther} disabled={revokeAllOtherLoading} loading={revokeAllOtherLoading}>
                {t('settings.endAllSessions')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {enable2FAModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !enable2FALoading && enable2FAStep !== 'success' && setEnable2FAModalOpen(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            {enable2FAStep === 'success' ? (
              <>
                <div className="flex justify-center mb-4"><CheckCircle className="w-16 h-16 text-[var(--success)]" /></div>
                <h3 className="text-lg font-bold text-center text-[var(--text-primary)]">{t('settings.twoFaSuccessTitle')}</h3>
                <p className="text-sm text-[var(--text-muted)] text-center mt-2">{t('settings.twoFaSuccessDesc')}</p>
                <Button type="button" variant="primary" fullWidth onClick={() => setEnable2FAModalOpen(false)} className="mt-6">{t('settings.twoFaDone')}</Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-6 h-6 text-[var(--brand)]" />
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">{t('settings.twoFaEnableTitle')}</h3>
                </div>
                <div className="border-b border-[var(--border)] mb-4" />
                <p className="text-xs text-[var(--text-muted)] mb-4">{t('settings.stepOf', { current: enable2FAStep, total: 3 })}</p>
                {enable2FAStep === 1 && (
                  <>
                    <p className="text-sm text-[var(--text-muted)] mb-3">{t('settings.twoFaStep1Desc')}</p>
                    <div className="grid grid-cols-1 gap-2 mb-6">
                      {['Google Authenticator', 'Authy', 'Microsoft Authenticator'].map((name, i) => (
                        <div key={i} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]">{name}</div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="primary" onClick={fetch2FASetup} disabled={enable2FALoading} loading={enable2FALoading}>{t('settings.twoFaNext')} ←</Button>
                    </div>
                  </>
                )}
                {enable2FAStep === 2 && setupData && (
                  <>
                    <p className="text-sm text-[var(--text-muted)] mb-3">{t('settings.twoFaStep2Desc')}</p>
                    <div className="flex justify-center mb-4">
                      <img src={setupData.qrCodeUrl} alt="QR Code" className="w-[200px] h-[200px] rounded-lg border border-[var(--border)]" />
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">{t('settings.twoFaStep2Manual')}</p>
                    <div className="flex items-center gap-2 mb-6">
                      <code className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)] font-mono">{setupData.manualCode}</code>
                      <button type="button" onClick={() => navigator.clipboard.writeText(setupData!.manualCode.replace(/\s/g, ''))} className="p-2 rounded-lg border border-[var(--border)]" title={t('settings.twoFaCopyCode')}><Copy className="w-4 h-4" /></button>
                    </div>
                    <div className="flex justify-between">
                      <Button type="button" variant="secondary" onClick={() => setEnable2FAStep(1)}>← {t('settings.twoFaPrev')}</Button>
                      <Button type="button" variant="primary" onClick={() => setEnable2FAStep(3)}>{t('settings.twoFaNext')} ←</Button>
                    </div>
                  </>
                )}
                {enable2FAStep === 3 && (
                  <>
                    <p className="text-sm text-[var(--text-muted)] mb-4">{t('settings.twoFaStep3Desc')}</p>
                    <OTPInput value={enable2FAOtp} onChange={setEnable2FAOtp} onComplete={submitEnable2FA} error={!!enable2FAError} className="mb-4" />
                    {enable2FAError && <p className="text-xs text-[var(--danger)] mb-4 text-center">{enable2FAError}</p>}
                    <div className="flex justify-between">
                      <Button type="button" variant="secondary" onClick={() => setEnable2FAStep(2)} disabled={enable2FALoading}>← {t('settings.twoFaPrev')}</Button>
                      <Button type="button" variant="primary" onClick={() => enable2FAOtp.length === 6 && submitEnable2FA(enable2FAOtp)} disabled={enable2FAOtp.length !== 6 || enable2FALoading} loading={enable2FALoading}>✓ {t('settings.enable')}</Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {disable2FAModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !disable2FALoading && setDisable2FAModalOpen(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center mb-4"><ShieldOff className="w-12 h-12 text-[var(--danger)]" /></div>
            <h3 className="text-lg font-bold text-center text-[var(--text-primary)]">{t('settings.twoFaDisableTitle')}</h3>
            <div className="border-b border-[var(--border)] my-4" />
            <p className="text-sm text-[var(--text-muted)] mb-4">{t('settings.twoFaDisableDesc')}</p>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">{t('settings.password')}</label>
            <Input type="password" value={disable2FAPassword} onChange={(e) => setDisable2FAPassword(e.target.value)} placeholder={t('settings.password')} className="mb-4" />
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">{t('settings.twoFaVerificationCode', { defaultValue: 'Verification code from app' })}</label>
            <OTPInput value={disable2FAOtp} onChange={setDisable2FAOtp} className="mb-4" />
            {disable2FAError && <p className="text-xs text-[var(--danger)] mb-4">{disable2FAError}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={() => setDisable2FAModalOpen(false)} disabled={disable2FALoading}>{t('common.cancel')}</Button>
              <Button type="button" variant="danger" loading={disable2FALoading} onClick={submitDisable2FA} disabled={!disable2FAPassword || disable2FAOtp.length !== 6 || disable2FALoading}>{t('settings.twoFaDisableConfirm')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
