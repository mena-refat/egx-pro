import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Lock,
  Shield,
  ShieldCheck,
  ShieldOff,
  Settings,
  Bell,
  Moon,
  Sun,
  Monitor,
  Eye,
  EyeOff,
  Trash2,
  Check,
  CheckCircle,
  X,
  Loader2,
  Smartphone,
  Tablet,
  Key,
  Pencil,
  ChevronDown,
  Copy,
} from 'lucide-react';
import { validateChangePassword, validateUsernameFormat, USERNAME_MAX_LENGTH } from '../lib/validations';
import { OTPInput } from './OTPInput';

export interface SettingsUserProfile {
  id: string;
  fullName?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  lastPasswordChangeAt?: string | null;
  lastUsernameChangeAt?: string | null;
  twoFactorEnabled?: boolean;
  twoFactorEnabledAt?: string | null;
  language?: string;
  theme?: string;
  shariaMode?: boolean;
  notifySignals?: boolean;
  notifyPortfolio?: boolean;
  notifyNews?: boolean;
  notifyAchievements?: boolean;
  notifyGoals?: boolean;
}

const USERNAME_COOLDOWN_DAYS = 7;

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

function displayPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('20') ? digits.slice(2) : digits;
}

export function SettingsTabContent({
  user,
  accessToken,
  onUpdateProfile,
  onLogout,
  setRequestStatus,
}: {
  user: SettingsUserProfile;
  accessToken: string | null;
  onUpdateProfile: (data: Record<string, unknown>, messages?: { success?: string; error?: string }) => Promise<void>;
  onLogout: () => void;
  setRequestStatus: (s: { type: 'success' | 'error'; message: string } | null) => void;
}) {
  const { t, i18n } = useTranslation('common');

  // Account fields – which is being edited
  const [editingField, setEditingField] = useState<'fullName' | 'username' | 'email' | 'phone' | null>(null);
  const [fullNameVal, setFullNameVal] = useState(user.fullName ?? '');
  const [usernameVal, setUsernameVal] = useState(user.username ?? '');
  const [emailVal, setEmailVal] = useState(user.email ?? '');
  const [phoneVal, setPhoneVal] = useState(displayPhone(user.phone));
  const [successField, setSuccessField] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);

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
  const [twoFactorEnabledAt, setTwoFactorEnabledAt] = useState<string | null>(null);

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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [goodbyeOpen, setGoodbyeOpen] = useState(false);
  const [goodbyeName, setGoodbyeName] = useState('');

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    account: false,
    security: false,
    preferences: false,
    notifications: false,
  });
  const toggleSection = (id: string) => setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    setFullNameVal(user.fullName ?? '');
    setUsernameVal(user.username ?? '');
    setEmailVal(user.email ?? '');
    setPhoneVal(displayPhone(user.phone));
  }, [user.fullName, user.username, user.email, user.phone]);

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

  // Username format error (don't call API if invalid format)
  const usernameFormatError = validateUsernameFormat(usernameVal);

  // Username availability debounce 500ms (only when format is valid)
  useEffect(() => {
    if (!accessToken || !usernameVal || usernameVal === (user.username ?? '') || usernameFormatError) {
      setUsernameStatus('idle');
      setUsernameMessage(null);
      return;
    }
    const h = setTimeout(async () => {
      setUsernameStatus('checking');
      setUsernameMessage(null);
      try {
        const res = await fetch(`/api/user/username/check?username=${encodeURIComponent(usernameVal)}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Invalid');
        if (data.available) {
          setUsernameStatus('available');
          setUsernameMessage(null);
        } else {
          setUsernameStatus('taken');
          setUsernameMessage(t('settings.usernameTaken'));
        }
      } catch {
        setUsernameStatus('error');
        setUsernameMessage(t('settings.usernameTaken'));
      }
    }, 500);
    return () => clearTimeout(h);
  }, [usernameVal, user.username, accessToken, t, usernameFormatError]);

  const usernameCooldownDays = (() => {
    const at = user.lastUsernameChangeAt;
    if (!at) return 0;
    const diff = (Date.now() - new Date(at).getTime()) / (1000 * 60 * 60 * 24);
    if (diff >= USERNAME_COOLDOWN_DAYS) return 0;
    return Math.ceil(USERNAME_COOLDOWN_DAYS - diff);
  })();
  const usernameDisabled = usernameCooldownDays > 0;

  const saveField = useCallback(
    async (field: 'fullName' | 'username' | 'email' | 'phone') => {
      if (!accessToken) return;
      setSavingField(field);
      setDeleteError(null);
      try {
        if (field === 'fullName') {
          await onUpdateProfile({ fullName: fullNameVal }, { success: '' });
          setSuccessField('fullName');
          setEditingField(null);
        } else if (field === 'username') {
          const formatErr = validateUsernameFormat(usernameVal);
          if (formatErr) {
            setRequestStatus({ type: 'error', message: t(formatErr) });
            setSavingField(null);
            return;
          }
          if (usernameStatus !== 'available' && usernameVal !== (user.username ?? '')) return;
          await onUpdateProfile({ username: usernameVal || null }, { success: '' });
          setSuccessField('username');
          setEditingField(null);
        } else if (field === 'email') {
          await onUpdateProfile({ email: emailVal.trim() || null }, { success: '' });
          setSuccessField('email');
          setEditingField(null);
        } else if (field === 'phone') {
          const digits = phoneVal.replace(/\D/g, '');
          if (!digits) {
            setPhoneError(t('error.phone_required'));
            setSavingField(null);
            return;
          }
          if (digits.length !== 11) {
            setPhoneError(t('error.phone_11_digits'));
            setSavingField(null);
            return;
          }
          if (!/^01[0125][0-9]{8}$/.test(digits)) {
            setPhoneError(t('error.invalid_phone'));
            setSavingField(null);
            return;
          }
          setPhoneError(null);
          await onUpdateProfile({ phone: digits }, { success: '' });
          setSuccessField('phone');
          setEditingField(null);
        }
        setRequestStatus({ type: 'success', message: t('settings.savedSuccess') });
        setTimeout(() => setSuccessField(null), 2000);
      } catch (e) {
        setRequestStatus({ type: 'error', message: (e as Error).message || 'Failed to save' });
      } finally {
        setSavingField(null);
      }
    },
    [accessToken, fullNameVal, usernameVal, emailVal, phoneVal, usernameStatus, user.username, onUpdateProfile, setRequestStatus, t]
  );

  const fetchSessions = useCallback(async () => {
    if (!accessToken) return;
    setSessionsLoading(true);
    try {
      let list: Array<{ id: string; deviceInfo?: string; createdAt: string; isCurrentSession?: boolean }> = [];
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
      setSessions(
        list.map((s: { id: string; deviceType?: string; browser?: string; os?: string; deviceInfo?: string; city?: string; country?: string; createdAt: string; isCurrentSession?: boolean }) => ({
          id: s.id,
          deviceType: s.deviceType,
          browser: s.browser,
          os: s.os,
          deviceInfo: s.deviceInfo,
          city: s.city,
          country: s.country,
          createdAt: s.createdAt,
          isCurrentSession: s.isCurrentSession ?? false,
        }))
      );
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

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
      setRequestStatus({ type: 'error', message: i18n.language === 'ar' ? 'فشل إنهاء الجلسات' : 'Failed to end sessions' });
    } finally {
      setRevokeAllOtherLoading(false);
    }
  };

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
      setPasswordMessage(pwCheck.message);
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

  const handleDeleteAccount = async () => {
    const confirmNorm = deleteConfirmText.trim().toUpperCase();
    if (confirmNorm !== 'حذف' && confirmNorm !== 'DELETE') return;
    if (!deletePassword || !accessToken) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ confirmText: deleteConfirmText.trim(), password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === 'wrong_password' || data?.message) {
          setDeleteError(data?.message || t('settings.wrongPassword'));
        } else {
          setDeleteError(data?.error || data?.message || 'Failed');
        }
        return;
      }
      setDeleteDialogOpen(false);
      setGoodbyeName(user.fullName || user.username || '');
      setGoodbyeOpen(true);
      const t1 = setTimeout(() => {
        setGoodbyeOpen(false);
        onLogout();
      }, 5000);
      (window as unknown as { __goodbyeTimeout?: ReturnType<typeof setTimeout> }).__goodbyeTimeout = t1;
    } catch (err) {
      setDeleteError((err as Error).message || 'Failed');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const deleteConfirmValid = (() => {
    const n = deleteConfirmText.trim();
    return n === 'حذف' || n.toUpperCase() === 'DELETE';
  })();

  const cardClass = 'rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6';
  const inputBase = 'w-full bg-[var(--bg-input)] border rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none transition-colors';

  return (
    <div className="space-y-4">
      {/* 1. بيانات الحساب */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('account')}
          className="w-full flex items-center justify-between gap-2 p-6 text-left hover:bg-[var(--bg-card-hover)] transition-colors"
        >
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-0">
            <User className="w-5 h-5 text-[var(--text-muted)]" />
            {t('settings.accountData')}
          </h3>
          <ChevronDown className={`w-5 h-5 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${openSections.account ? 'rotate-180' : ''}`} />
        </button>
        {openSections.account && (
          <div className="px-6 pb-6 pt-0 border-t border-[var(--border)]">
        <div className="space-y-0 divide-y divide-[var(--border-subtle)]">
          {(['fullName', 'username', 'email', 'phone'] as const).map((field) => {
            const label = t(`settings.${field === 'fullName' ? 'fullName' : field === 'username' ? 'username' : field === 'email' ? 'email' : 'phone'}`);
            const isEditing = editingField === field;
            const value =
              field === 'fullName'
                ? fullNameVal
                : field === 'username'
                  ? usernameVal
                  : field === 'email'
                    ? emailVal
                    : phoneVal;
            const setValue =
              field === 'fullName'
                ? setFullNameVal
                : field === 'username'
                  ? setUsernameVal
                  : field === 'email'
                    ? setEmailVal
                    : setPhoneVal;
            const isUsername = field === 'username';
            const isPhone = field === 'phone';
            const disabled = isUsername && usernameDisabled;
            const isRtl = i18n.language === 'ar';
            const ltrField = isPhone || isUsername || field === 'email';
            return (
              <div key={field} className="py-4 first:pt-0">
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">{label}</label>
                <div className="relative flex items-center">
                  <input
                    type={isPhone ? 'tel' : 'text'}
                    value={value}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (isPhone) setValue(v.replace(/\D/g, ''));
                      else if (isUsername) setValue(v.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, USERNAME_MAX_LENGTH));
                      else setValue(v);
                    }}
                    dir={ltrField ? 'ltr' : undefined}
                    className={`${inputBase} border-[var(--border)] disabled:opacity-90 pl-10 pr-4 ${isRtl ? 'text-right' : ''} ${isEditing ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]/20' : ''}`}
                    placeholder={label}
                    maxLength={isPhone ? 11 : isUsername ? USERNAME_MAX_LENGTH : undefined}
                    disabled={!isEditing}
                    autoFocus={isEditing}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveField(field)}
                          disabled={savingField === field || (isUsername && (usernameFormatError || (usernameStatus !== 'available' && value !== (user.username ?? ''))))}
                          className="p-1 rounded text-[var(--success)] hover:bg-[var(--success-bg)]"
                          aria-label={t('settings.save')}
                        >
                          {savingField === field ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingField(null);
                            setValue(
                              field === 'fullName'
                                ? user.fullName ?? ''
                                : field === 'username'
                                  ? user.username ?? ''
                                  : field === 'email'
                                    ? user.email ?? ''
                                    : displayPhone(user.phone)
                            );
                            setPhoneError(null);
                          }}
                          className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]"
                          aria-label={t('settings.cancel')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      !disabled && (
                        <button
                          type="button"
                          onClick={() => setEditingField(field)}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-subtle)]"
                          aria-label={t('settings.edit')}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>
                {isUsername && isEditing && (
                  <p className="mt-1.5 text-xs flex items-center gap-1">
                    {usernameFormatError && <span className="text-[var(--danger)] flex items-center gap-1"><X className="w-3.5 h-3.5" /> {t(usernameFormatError)}</span>}
                    {!usernameFormatError && usernameStatus === 'checking' && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> ...</>}
                    {!usernameFormatError && usernameStatus === 'available' && <span className="text-[var(--success)] flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {i18n.language === 'ar' ? 'متاح' : 'Available'}</span>}
                    {!usernameFormatError && (usernameStatus === 'taken' || usernameStatus === 'error') && <span className="text-[var(--danger)] flex items-center gap-1"><X className="w-3.5 h-3.5" /> {usernameMessage || t('settings.usernameTaken')}</span>}
                  </p>
                )}
                {isUsername && usernameDisabled && !isEditing && (
                  <p className="mt-1.5 text-xs text-[var(--text-muted)]">{t('settings.usernameChangeIn', { days: usernameCooldownDays })}</p>
                )}
                {isPhone && phoneError && <p className="mt-1.5 text-xs text-[var(--danger)]">{phoneError}</p>}
                {successField === field && (
                  <p className="mt-1.5 text-xs text-[var(--success)] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {t('settings.savedSuccess')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
          </div>
        )}
      </div>

      {/* 2. الأمان والخصوصية */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('security')}
          className="w-full flex items-center justify-between gap-2 p-6 text-left hover:bg-[var(--bg-card-hover)] transition-colors"
        >
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-0">
            <Lock className="w-5 h-5 text-[var(--text-muted)]" />
            {t('settings.securityPrivacy')}
          </h3>
          <ChevronDown className={`w-5 h-5 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${openSections.security ? 'rotate-180' : ''}`} />
        </button>
        {openSections.security && (
          <div className="px-6 pb-6 pt-0 border-t border-[var(--border)]">

        {/* كلمة المرور */}
        <div className="py-4">
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
              {showPasswordForm ? t('settings.cancel') : `${t('settings.change')} ←`}
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {t('settings.lastChange')}: {lastPasswordChangeAt ? new Date(lastPasswordChangeAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : t('settings.passwordNeverChanged')}
          </p>
          <AnimatePresence>
            {showPasswordForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-3 pt-2">
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={t('settings.currentPassword')}
                      className={`${inputBase} border-[var(--border)] pe-10`}
                    />
                    <button type="button" onClick={() => setShowCurrentPw((v) => !v)} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                      {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('settings.newPassword')}
                      className={`${inputBase} border-[var(--border)] pe-10`}
                    />
                    <button type="button" onClick={() => setShowNewPw((v) => !v)} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('settings.confirmPassword')}
                    className={`${inputBase} border-[var(--border)]`}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="px-3 py-2 rounded-xl text-sm font-medium bg-[var(--brand)] text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {changingPassword ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t('settings.update')}
                    </button>
                    <button type="button" onClick={() => setShowPasswordForm(false)} className="px-3 py-2 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)]">
                      {t('settings.cancel')}
                    </button>
                  </div>
                  {passwordMessage && <p className="text-xs text-[var(--text-muted)]">{passwordMessage}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2FA */}
        <div className="py-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
              {twoFactorEnabled ? <ShieldCheck className="w-4 h-4 text-[var(--success)]" /> : <Shield className="w-4 h-4 text-[var(--text-muted)]" />}
              {t('settings.twoFa')}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {twoFactorEnabled && twoFactorEnabledAt
                ? t('settings.twoFaEnabledSince', { date: new Date(twoFactorEnabledAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) })
                : t('settings.twoFaDesc')}
            </p>
            {!twoFactorEnabled && <p className="text-xs text-[var(--text-muted)]">{t('settings.twoFaNotEnabled')}</p>}
          </div>
          <div className="flex items-center gap-2">
            {twoFactorEnabled ? (
              <>
                <span className="text-xs px-2 py-1 rounded-full bg-[var(--success-bg)] text-[var(--success)]">● {t('settings.enabled')}</span>
                <button
                  type="button"
                  onClick={() => { setDisable2FAModalOpen(true); setDisable2FAError(null); setDisable2FAPassword(''); setDisable2FAOtp(''); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                >
                  {t('settings.twoFaDisableConfirm')}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={openEnable2FAModal}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--brand)] text-white hover:opacity-90"
              >
                {t('settings.enable')}
              </button>
            )}
          </div>
        </div>

        {/* Enable 2FA Modal */}
        {enable2FAModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !enable2FALoading && enable2FAStep !== 'success' && setEnable2FAModalOpen(false)}>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              {enable2FAStep === 'success' ? (
                <>
                  <div className="flex justify-center mb-4"><CheckCircle className="w-16 h-16 text-[var(--success)]" /></div>
                  <h3 className="text-lg font-bold text-center text-[var(--text-primary)]">{t('settings.twoFaSuccessTitle')}</h3>
                  <p className="text-sm text-[var(--text-muted)] text-center mt-2">{t('settings.twoFaSuccessDesc')}</p>
                  <button type="button" onClick={() => { setEnable2FAModalOpen(false); }} className="w-full mt-6 py-2.5 rounded-xl text-sm font-medium bg-[var(--brand)] text-white">
                    {t('settings.twoFaDone')}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-6 h-6 text-[var(--brand)]" />
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{t('settings.twoFaEnableTitle')}</h3>
                  </div>
                  <div className="border-b border-[var(--border)] mb-4" />
                  <p className="text-xs text-[var(--text-muted)] mb-4">{enable2FAStep} {i18n.language === 'ar' ? 'من 3' : 'of 3'}</p>

                  {enable2FAStep === 1 && (
                    <>
                      <p className="text-sm text-[var(--text-muted)] mb-3">{t('settings.twoFaStep1Desc')}</p>
                      <div className="grid grid-cols-1 gap-2 mb-6">
                        {['Google Authenticator', 'Authy', 'Microsoft Authenticator'].map((name, i) => (
                          <div key={i} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]">
                            {name}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <button type="button" onClick={fetch2FASetup} disabled={enable2FALoading} className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--brand)] text-white">
                          {enable2FALoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : `${t('settings.twoFaNext')} ←`}
                        </button>
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
                        <code className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)] font-mono">
                          {setupData.manualCode}
                        </code>
                        <button type="button" onClick={() => navigator.clipboard.writeText(setupData.manualCode.replace(/\s/g, ''))} className="p-2 rounded-lg border border-[var(--border)]" title={t('settings.twoFaCopyCode')}>
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between">
                        <button type="button" onClick={() => setEnable2FAStep(1)} className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)]">
                          ← {t('settings.twoFaPrev')}
                        </button>
                        <button type="button" onClick={() => setEnable2FAStep(3)} className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--brand)] text-white">
                          {t('settings.twoFaNext')} ←
                        </button>
                      </div>
                    </>
                  )}

                  {enable2FAStep === 3 && (
                    <>
                      <p className="text-sm text-[var(--text-muted)] mb-4">{t('settings.twoFaStep3Desc')}</p>
                      <OTPInput value={enable2FAOtp} onChange={setEnable2FAOtp} onComplete={submitEnable2FA} error={!!enable2FAError} className="mb-4" />
                      {enable2FAError && <p className="text-xs text-[var(--danger)] mb-4 text-center">{enable2FAError}</p>}
                      <div className="flex justify-between">
                        <button type="button" onClick={() => setEnable2FAStep(2)} disabled={enable2FALoading} className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)]">
                          ← {t('settings.twoFaPrev')}
                        </button>
                        <button type="button" onClick={() => enable2FAOtp.length === 6 && submitEnable2FA(enable2FAOtp)} disabled={enable2FAOtp.length !== 6 || enable2FALoading} className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--brand)] text-white">
                          {enable2FALoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : `✓ ${t('settings.enable')}`}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Disable 2FA Modal */}
        {disable2FAModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !disable2FALoading && setDisable2FAModalOpen(false)}>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center mb-4"><ShieldOff className="w-12 h-12 text-[var(--danger)]" /></div>
              <h3 className="text-lg font-bold text-center text-[var(--text-primary)]">{t('settings.twoFaDisableTitle')}</h3>
              <div className="border-b border-[var(--border)] my-4" />
              <p className="text-sm text-[var(--text-muted)] mb-4">{t('settings.twoFaDisableDesc')}</p>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">{t('settings.password')}</label>
              <input
                type="password"
                value={disable2FAPassword}
                onChange={(e) => setDisable2FAPassword(e.target.value)}
                className={`${inputBase} border-[var(--border)] mb-4`}
                placeholder={t('settings.password')}
              />
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">{i18n.language === 'ar' ? 'كود التحقق من التطبيق' : 'Verification code from app'}</label>
              <OTPInput value={disable2FAOtp} onChange={setDisable2FAOtp} className="mb-4" />
              {disable2FAError && <p className="text-xs text-[var(--danger)] mb-4">{disable2FAError}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setDisable2FAModalOpen(false)} disabled={disable2FALoading} className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)]">
                  {t('settings.cancel')}
                </button>
                <button type="button" onClick={submitDisable2FA} disabled={!disable2FAPassword || disable2FAOtp.length !== 6 || disable2FALoading} className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--danger)] text-white">
                  {disable2FALoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t('settings.twoFaDisableConfirm')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* الجلسات النشطة */}
        <div className="pt-4 border-t border-[var(--border-subtle)]">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
            {t('settings.sessions')}
            {sessions.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-muted)]">{sessions.length}</span>
            )}
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
                            <button
                              type="button"
                              onClick={() => endSession(s.id)}
                              disabled={revokingId === s.id}
                              className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)]"
                            >
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
            <button
              type="button"
              onClick={revokeAllOther}
              disabled={revokeAllOtherLoading}
              className="mt-3 text-xs text-[var(--danger)] hover:underline"
            >
              {revokeAllOtherLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : t('settings.endAllSessions')}
            </button>
          )}
        </div>
          </div>
        )}
      </div>

      {/* 3. التفضيلات */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('preferences')}
          className="w-full flex items-center justify-between gap-2 p-6 text-left hover:bg-[var(--bg-card-hover)] transition-colors"
        >
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-0">
            <Settings className="w-5 h-5 text-[var(--text-muted)]" />
            {t('settings.preferences')}
          </h3>
          <ChevronDown className={`w-5 h-5 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${openSections.preferences ? 'rotate-180' : ''}`} />
        </button>
        {openSections.preferences && (
          <div className="px-6 pb-6 pt-0 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--text-muted)] mb-3">{t('settings.theme')}</p>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { key: 'dark', label: t('settings.dark'), icon: Moon },
            { key: 'system', label: t('settings.system'), icon: Monitor },
            { key: 'light', label: t('settings.light'), icon: Sun },
          ].map((opt) => {
            const active = (user.theme ?? 'system') === opt.key;
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onUpdateProfile({ theme: opt.key }, { success: '' })}
                className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-sm transition-all ${active ? 'border-[var(--brand)] bg-[var(--brand-subtle)]' : 'border-[var(--border)] bg-[var(--bg-input)] hover:border-[var(--border-strong)]'}`}
              >
                <Icon className="w-5 h-5 text-[var(--text-secondary)]" />
                <span className="text-[var(--text-primary)]">{opt.label}</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-[var(--text-muted)] mb-3">{t('settings.language')}</p>
        <div className="grid grid-cols-2 gap-2 mb-6">
          <button
            type="button"
            onClick={() => onUpdateProfile({ language: 'ar' }, { success: '' })}
            className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${user.language === 'ar' || !user.language ? 'bg-[var(--brand)] text-white' : 'border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'}`}
          >
            {t('settings.arabic')}
          </button>
          <button
            type="button"
            onClick={() => onUpdateProfile({ language: 'en' }, { success: '' })}
            className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${user.language === 'en' ? 'bg-[var(--brand)] text-white' : 'border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'}`}
          >
            {t('settings.english')}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2 border-t border-[var(--border-subtle)]">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)]">{t('settings.shariaMode')}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{t('settings.shariaDescShort')}</p>
          </div>
          <button
            type="button"
            onClick={() => onUpdateProfile({ shariaMode: !user.shariaMode }, { success: '' })}
            className={`relative w-11 h-6 rounded-full px-1 transition-colors flex items-center shrink-0 ${user.shariaMode ? 'bg-[var(--brand)]' : 'bg-[var(--border-strong)]'}`}
          >
            <span className={`absolute w-4 h-4 rounded-full bg-white shadow transition-transform ${user.shariaMode ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
          </div>
        )}
      </div>

      {/* 4. الإشعارات */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('notifications')}
          className="w-full flex items-center justify-between gap-2 p-6 text-left hover:bg-[var(--bg-card-hover)] transition-colors"
        >
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-0">
            <Bell className="w-5 h-5 text-[var(--text-muted)]" />
            {t('settings.notifications')}
          </h3>
          <ChevronDown className={`w-5 h-5 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${openSections.notifications ? 'rotate-180' : ''}`} />
        </button>
        {openSections.notifications && (
          <div className="px-6 pb-6 pt-0 border-t border-[var(--border)]">
        <div className="space-y-0 divide-y divide-[var(--border-subtle)]">
          {[
            { key: 'notifySignals', label: t('settings.notifySignals'), desc: t('settings.notifySignalsDesc') },
            { key: 'notifyPortfolio', label: t('settings.notifyPortfolio'), desc: t('settings.notifyPortfolioDesc') },
            { key: 'notifyNews', label: t('settings.notifyNews'), desc: t('settings.notifyNewsDesc') },
            { key: 'notifyAchievements', label: t('settings.notifyAchievements'), desc: t('settings.notifyAchievementsDesc') },
            { key: 'notifyGoals', label: t('settings.notifyGoals'), desc: t('settings.notifyGoalsDesc') },
          ].map(({ key, label, desc }) => {
            const value = (user as Record<string, unknown>)[key] ?? true;
            return (
              <div key={key} className="flex items-center justify-between gap-4 py-4 first:pt-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateProfile({ [key]: !value }, { success: '' })}
                  className={`relative w-11 h-6 rounded-full px-1 transition-colors flex items-center shrink-0 ${value ? 'bg-[var(--brand)]' : 'bg-[var(--border-strong)]'}`}
                >
                  <span className={`absolute w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            );
          })}
        </div>
          </div>
        )}
      </div>

      {/* أسفل الصفحة: حذف الحساب */}
      <div className="pt-4 border-t border-[var(--border)]">
        <button type="button" onClick={() => setDeleteDialogOpen(true)} className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)] underline">
          {t('settings.deleteAccountPrompt')}
        </button>
      </div>

      {/* Delete account dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setDeleteDialogOpen(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center">
              <Trash2 className="w-12 h-12 text-[var(--danger)]" />
            </div>
            <h3 className="text-lg font-bold text-center text-[var(--text-primary)]">{t('settings.deleteTitle')}</h3>
            <p className="text-sm font-medium text-[var(--text-secondary)] mt-2">{t('settings.deleteReadFirst')}</p>
            <p className="text-xs text-[var(--text-muted)] text-center">{t('settings.deleteWarning')}</p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={t('settings.deleteConfirmPlaceholder')}
              className={`${inputBase} border-[var(--border)]`}
            />
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder={t('settings.password')}
              className={`${inputBase} border-[var(--border)]`}
            />
            {deleteError && <p className="text-xs text-[var(--danger)]">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={!deleteConfirmValid || !deletePassword || deleteSubmitting}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-[var(--danger)] text-white hover:opacity-90 disabled:opacity-50"
              >
                {deleteSubmitting ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t('settings.confirmDelete')}
              </button>
              <button type="button" onClick={() => setDeleteDialogOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)]">
                {t('settings.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goodbye card */}
      {goodbyeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => {
            const t = (window as unknown as { __goodbyeTimeout?: ReturnType<typeof setTimeout> }).__goodbyeTimeout;
            if (t) clearTimeout(t);
            setGoodbyeOpen(false);
            onLogout();
          }}
        >
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-2" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {t('settings.goodbyeTitle', { name: goodbyeName })} 💙
            </p>
            <p className="text-sm text-[var(--text-muted)]">{t('settings.goodbyeBody')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
