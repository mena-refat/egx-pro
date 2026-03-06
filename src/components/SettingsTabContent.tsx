import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User,
  Lock,
  Shield,
  Settings,
  Bell,
  Moon,
  Sun,
  Monitor,
  Eye,
  EyeOff,
  Trash2,
  Check,
  X,
  Loader2,
  Smartphone,
  Tablet,
  Key,
  Pencil,
} from 'lucide-react';
import { validateChangePassword } from '../lib/validations';

export interface SettingsUserProfile {
  id: string;
  fullName?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  lastPasswordChangeAt?: string | null;
  lastUsernameChangeAt?: string | null;
  twoFactorEnabled?: boolean;
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
  const [twoFaSecret, setTwoFaSecret] = useState<string | null>(null);
  const [twoFaQr, setTwoFaQr] = useState<string | null>(null);
  const [twoFaToken, setTwoFaToken] = useState('');
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaMessage, setTwoFaMessage] = useState<string | null>(null);

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
        }
      } catch {
        // ignore
      }
    };
    run();
  }, [accessToken]);

  // Username availability debounce 500ms
  useEffect(() => {
    if (!accessToken || !usernameVal || usernameVal === (user.username ?? '')) {
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
  }, [usernameVal, user.username, accessToken, t]);

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
            setPhoneError(i18n.language === 'ar' ? 'رقم الموبايل مطلوب' : 'Phone number is required');
            setSavingField(null);
            return;
          }
          if (digits.length !== 11) {
            setPhoneError(i18n.language === 'ar' ? 'رقم الموبايل لازم يكون 11 رقم' : 'Phone number must be 11 digits');
            setSavingField(null);
            return;
          }
          if (!/^01[0125][0-9]{8}$/.test(digits)) {
            setPhoneError(i18n.language === 'ar' ? 'رقم الموبايل غير صحيح' : 'Invalid Egyptian phone number');
            setSavingField(null);
            return;
          }
          setPhoneError(null);
          await onUpdateProfile({ phone: digits }, { success: '' });
          setSuccessField('phone');
          setEditingField(null);
        }
        setRequestStatus({ type: 'success', message: i18n.language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully' });
        setTimeout(() => setSuccessField(null), 2000);
      } catch (e) {
        setRequestStatus({ type: 'error', message: (e as Error).message || 'Failed to save' });
      } finally {
        setSavingField(null);
      }
    },
    [accessToken, fullNameVal, usernameVal, emailVal, phoneVal, usernameStatus, user.username, onUpdateProfile, setRequestStatus, i18n.language]
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
      setRequestStatus({ type: 'success', message: i18n.language === 'ar' ? 'تم إنهاء الجلسات الأخرى' : 'Other sessions ended' });
    } catch {
      setRequestStatus({ type: 'error', message: i18n.language === 'ar' ? 'فشل إنهاء الجلسات' : 'Failed to end sessions' });
    } finally {
      setRevokeAllOtherLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!accessToken) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage(i18n.language === 'ar' ? 'املأ كل الحقول' : 'Fill all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage(i18n.language === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
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
      setPasswordMessage((err as Error).message || (i18n.language === 'ar' ? 'فشل تغيير كلمة المرور' : 'Failed to change password'));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleTwoFaSetup = async () => {
    if (!accessToken) return;
    setTwoFaLoading(true);
    setTwoFaMessage(null);
    try {
      const res = await fetch('/api/user/2fa/setup', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setTwoFaSecret(data.secret);
      setTwoFaQr(data.qrCode);
    } catch {
      setTwoFaMessage(i18n.language === 'ar' ? 'فشل تهيئة 2FA' : 'Failed to setup 2FA');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleTwoFaVerify = async () => {
    if (!accessToken || !twoFaSecret || !twoFaToken) return;
    setTwoFaLoading(true);
    setTwoFaMessage(null);
    try {
      const res = await fetch('/api/user/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ token: twoFaToken, secret: twoFaSecret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setTwoFactorEnabled(true);
      setTwoFaMessage(t('settings.enabled'));
      setTwoFaToken('');
      setTwoFaSecret(null);
      setTwoFaQr(null);
    } catch {
      setTwoFaMessage(i18n.language === 'ar' ? 'الكود غير صحيح' : 'Invalid code');
    } finally {
      setTwoFaLoading(false);
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
          setDeleteError(data?.message || (i18n.language === 'ar' ? 'كلمة المرور غير صحيحة' : 'Wrong password'));
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

  const cardClass = 'rounded-2xl border border-slate-700 dark:border-slate-700 bg-slate-900/50 dark:bg-slate-900/50 shadow-md';
  const cardPadding = 'p-6';
  const inputClass = 'w-full bg-slate-800 dark:bg-slate-800 border border-slate-600 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-200';
  const sectionTitleClass = 'text-base font-semibold text-slate-200 flex items-center gap-2';

  return (
    <div className="space-y-4">
      {/* 1. بيانات الحساب */}
      <div className={`${cardClass} ${cardPadding}`}>
        <h3 className={`${sectionTitleClass} mb-4`}>
          <User className="w-5 h-5 text-slate-400" />
          {t('settings.accountData')}
        </h3>
        <div className="space-y-0 divide-y divide-slate-700">
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
            return (
              <div key={field} className="py-4 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-300">{label}</span>
                  {!isEditing && !disabled && (
                    <button
                      type="button"
                      onClick={() => setEditingField(field)}
                      className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {t('settings.edit')}
                    </button>
                  )}
                </div>
                <div className="mt-2 border-b border-slate-700/80 pb-2 mb-2" />
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type={isPhone ? 'tel' : 'text'}
                        value={value}
                        onChange={(e) => setValue(isPhone ? e.target.value.replace(/\D/g, '') : e.target.value)}
                        className={inputClass}
                        placeholder={label}
                        maxLength={isPhone ? 11 : undefined}
                        disabled={disabled}
                        autoFocus
                      />
                      {isUsername && (
                        <span className="flex items-center gap-1 shrink-0">
                          {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                          {usernameStatus === 'available' && <Check className="w-4 h-4 text-emerald-400" />}
                          {(usernameStatus === 'taken' || usernameStatus === 'error') && <X className="w-4 h-4 text-red-400" />}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveField(field)}
                        disabled={savingField === field || (isUsername && usernameStatus !== 'available' && value !== (user.username ?? ''))}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50"
                      >
                        {savingField === field ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : t('settings.save')}
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
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-600 text-slate-300 hover:bg-slate-800"
                      >
                        {t('settings.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">{value || '—'}</p>
                )}
                {isUsername && usernameDisabled && (
                  <p className="text-xs text-amber-500 mt-1">{t('settings.usernameChangeIn', { days: usernameCooldownDays })}</p>
                )}
                {isUsername && usernameMessage && (usernameStatus === 'taken' || usernameStatus === 'error') && (
                  <p className="text-xs text-red-400 mt-1">{usernameMessage}</p>
                )}
                {isPhone && phoneError && <p className="text-xs text-red-400 mt-1">{phoneError}</p>}
                {successField === field && (
                  <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {i18n.language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. الأمان والخصوصية */}
      <div className={`${cardClass} ${cardPadding}`}>
        <h3 className={`${sectionTitleClass} mb-4`}>
          <Lock className="w-5 h-5 text-slate-400" />
          {t('settings.securityPrivacy')}
        </h3>
        <div className="space-y-0 divide-y divide-slate-700">
          <div className="py-4 first:pt-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-200">{t('settings.password')}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordForm((v) => !v)}
                className="text-xs font-medium text-violet-400 hover:text-violet-300"
              >
                {showPasswordForm ? t('settings.cancel') : t('settings.change')}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t('settings.lastChange')}: {lastPasswordChangeAt ? new Date(lastPasswordChangeAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : t('settings.passwordNeverChanged')}
            </p>
            {showPasswordForm && (
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t('settings.currentPassword')}
                    className={`${inputClass} pe-10`}
                  />
                  <button type="button" onClick={() => setShowCurrentPw((v) => !v)} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('settings.newPassword')}
                    className={`${inputClass} pe-10`}
                  />
                  <button type="button" onClick={() => setShowNewPw((v) => !v)} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('settings.confirmPassword')}
                    className={`${inputClass} pe-10`}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {changingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : t('settings.update')}
                  </button>
                  <button type="button" onClick={() => setShowPasswordForm(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-600 text-slate-300">
                    {t('settings.cancel')}
                  </button>
                </div>
                {passwordMessage && <p className="text-xs text-slate-400">{passwordMessage}</p>}
              </div>
            )}
          </div>

          <div className="py-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-400" />
                {t('settings.twoFa')}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{t('settings.twoFaDesc')}</p>
            </div>
            {twoFactorEnabled ? (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">{t('settings.enabled')}</span>
            ) : !twoFaSecret ? (
              <button
                type="button"
                onClick={handleTwoFaSetup}
                disabled={twoFaLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {twoFaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : t('settings.enable')}
              </button>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={twoFaToken}
                  onChange={(e) => setTwoFaToken(e.target.value)}
                  placeholder="123456"
                  className="w-24 px-2 py-1 rounded border border-slate-600 bg-slate-800 text-sm"
                />
                <button type="button" onClick={handleTwoFaVerify} disabled={twoFaLoading} className="px-2 py-1 rounded text-xs bg-violet-600 text-white">
                  {t('settings.update')}
                </button>
              </div>
            )}
            {twoFaMessage && <p className="text-xs text-slate-400 mt-1 w-full">{twoFaMessage}</p>}
          </div>

          <div className="pt-4">
            <p className="text-sm font-medium text-slate-200 mb-3">{t('settings.sessions')}</p>
            {sessionsLoading ? (
              <p className="text-xs text-slate-500">{i18n.language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-slate-500">{i18n.language === 'ar' ? 'لا توجد جلسات أخرى' : 'No other sessions'}</p>
            ) : (
              <ul className="space-y-0 rounded-xl border border-slate-700 overflow-hidden">
                {sessions.map((s) => {
                  const dt = (s.deviceType || '').toLowerCase();
                  const DeviceIcon = dt === 'mobile' ? Smartphone : dt === 'tablet' ? Tablet : Monitor;
                  const label = sessionDeviceLabel(s, t);
                  const lastActivity = formatLastActivity(s.createdAt, t);
                  const location = [s.city, s.country].filter(Boolean).join(', ') || null;
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-700 last:border-b-0 bg-slate-800/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <DeviceIcon className="w-5 h-5 text-slate-500 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-slate-200">{label}</p>
                            {s.isCurrentSession ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-violet-500/30 text-violet-300">{t('settings.youAreHere')}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => endSession(s.id)}
                                disabled={revokingId === s.id}
                                className="text-xs text-slate-400 hover:text-red-400"
                              >
                                {revokingId === s.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : t('settings.endSession')}
                              </button>
                            )}
                          </div>
                          {location && <p className="text-xs text-slate-500 mt-0.5">{location}</p>}
                          <p className="text-xs text-slate-500">{lastActivity}</p>
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
                className="mt-3 text-xs text-slate-500 hover:text-slate-400"
              >
                {revokeAllOtherLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : t('settings.endAllSessions')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. التفضيلات */}
      <div className={`${cardClass} ${cardPadding}`}>
        <h3 className={`${sectionTitleClass} mb-4`}>
          <Settings className="w-5 h-5 text-slate-400" />
          {t('settings.preferences')}
        </h3>
        <div className="space-y-0 divide-y divide-slate-700">
          <div className="py-4 first:pt-0">
            <p className="text-sm font-medium text-slate-200 mb-3">{t('settings.theme')}</p>
            <div className="flex flex-row-reverse gap-2 justify-end">
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
                    className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border text-sm transition-all ${active ? 'border-violet-500 bg-violet-500/10' : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'}`}
                  >
                    <Icon className="w-5 h-5 text-slate-300" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="py-4 flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-medium text-slate-200">{t('settings.language')}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onUpdateProfile({ language: 'ar' }, { success: '' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${user.language === 'ar' || !user.language ? 'bg-violet-600 text-white' : 'border border-slate-600 text-slate-400 hover:bg-slate-800'}`}
              >
                {t('settings.arabic')}
              </button>
              <button
                type="button"
                onClick={() => onUpdateProfile({ language: 'en' }, { success: '' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${user.language === 'en' ? 'bg-violet-600 text-white' : 'border border-slate-600 text-slate-400 hover:bg-slate-800'}`}
              >
                {t('settings.english')}
              </button>
            </div>
          </div>
          <div className="py-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200">{t('settings.shariaMode')}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t('settings.shariaDescShort')}</p>
            </div>
            <button
              type="button"
              onClick={() => onUpdateProfile({ shariaMode: !user.shariaMode }, { success: '' })}
              className={`relative w-11 h-6 rounded-full px-1 transition-colors flex items-center shrink-0 ${user.shariaMode ? 'bg-violet-600' : 'bg-slate-600'}`}
            >
              <span className={`absolute w-4 h-4 rounded-full bg-white shadow transition-transform ${user.shariaMode ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. الإشعارات */}
      <div className={`${cardClass} ${cardPadding}`}>
        <h3 className={`${sectionTitleClass} mb-4`}>
          <Bell className="w-5 h-5 text-slate-400" />
          {t('settings.notifications')}
        </h3>
        <div className="space-y-0 divide-y divide-slate-700">
          {[
            { key: 'notifySignals', label: t('settings.notifySignals'), desc: t('settings.notifySignalsDesc') },
            { key: 'notifyPortfolio', label: t('settings.notifyPortfolio'), desc: t('settings.notifyPortfolioDesc') },
            { key: 'notifyNews', label: t('settings.notifyNews'), desc: t('settings.notifyNewsDesc') },
            { key: 'notifyAchievements', label: t('settings.notifyAchievements'), desc: t('settings.notifyAchievementsDesc') },
            { key: 'notifyGoals', label: t('settings.notifyGoals'), desc: t('settings.notifyGoalsDesc') },
          ].map(({ key, label, desc }) => {
            const value = (user as Record<string, unknown>)[key] ?? true;
            return (
              <div key={key} className="flex items-center justify-between py-4 first:pt-0">
                <div>
                  <p className="text-sm font-medium text-slate-200">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateProfile({ [key]: !value }, { success: '' })}
                  className={`relative w-11 h-6 rounded-full px-1 transition-colors flex items-center ${value ? 'bg-violet-600' : 'bg-slate-600'}`}
                >
                  <span className={`absolute w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* أسفل الصفحة: حذف الحساب فقط (تسجيل الخروج من الـ dropdown في الهيدر) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          <button type="button" onClick={() => setDeleteDialogOpen(true)} className="underline hover:text-slate-400">
            {t('settings.deleteAccountPrompt')}
          </button>
        </p>
      </div>

      {/* Delete account dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setDeleteDialogOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center">
              <Trash2 className="w-12 h-12 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-center text-slate-200">{t('settings.deleteTitle')}</h3>
            <p className="text-sm font-medium text-slate-300 mt-2">{t('settings.deleteReadFirst')}</p>
            <p className="text-xs text-slate-400 text-center">{t('settings.deleteWarning')}</p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={t('settings.deleteConfirmPlaceholder')}
              className={inputClass}
            />
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder={t('settings.password')}
              className={inputClass}
            />
            {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={!deleteConfirmValid || !deletePassword || deleteSubmitting}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deleteSubmitting ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t('settings.confirmDelete')}
              </button>
              <button type="button" onClick={() => setDeleteDialogOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-600 text-slate-400">
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
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-2" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold text-slate-200">
              {t('settings.goodbyeTitle', { name: goodbyeName })} 💙
            </p>
            <p className="text-sm text-slate-400">{t('settings.goodbyeBody')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
