import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Check, X, Pencil, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { validateUsernameFormat, USERNAME_MAX_LENGTH } from '../../../lib/validations';
import { TIMEOUTS } from '../../../lib/constants';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import type { ProfileTabProps } from './types';
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges';

function displayPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('20') ? digits.slice(2) : digits;
}

export function AccountTab({ user, onUpdateProfile, setRequestStatus }: ProfileTabProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { t, i18n } = useTranslation('common');
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
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [verifySending, setVerifySending] = useState(false);
  const [verifySent, setVerifySent] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
  }, []);

  const sendVerification = async () => {
    if (!accessToken || verifySending) return;
    setVerifySending(true);
    setRequestStatus(null);
    try {
      const res = await fetch('/api/auth/verify-email/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setVerifySent(true);
        setRequestStatus({ type: 'success', message: t('settings.verificationCodeSent') });
      } else {
        setRequestStatus({ type: 'error', message: data.error === 'already_verified' ? t('settings.emailVerified') : data.error === 'no_email' ? t('settings.emailNotVerified') : t('common.error') });
      }
    } catch {
      setRequestStatus({ type: 'error', message: t('common.error') });
    } finally {
      setVerifySending(false);
    }
  };

  useEffect(() => {
    setFullNameVal(user.fullName ?? '');
    setUsernameVal(user.username ?? '');
    setEmailVal(user.email ?? '');
    setPhoneVal(displayPhone(user.phone));
  }, [user.fullName, user.username, user.email, user.phone]);

  const usernameFormatError = validateUsernameFormat(usernameVal);

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
        const payload = (data as { data?: { available?: boolean } }).data ?? data;
        if (payload?.available) {
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
    }, TIMEOUTS.usernameCheckDebounce);
    return () => clearTimeout(h);
  }, [usernameVal, user.username, accessToken, t, usernameFormatError]);

  const usernameCooldownDays = (() => {
    const at = user.lastUsernameChangeAt;
    if (!at) return 0;
    const diff = (Date.now() - new Date(at).getTime()) / (1000 * 60 * 60 * 24);
    if (diff >= 7) return 0;
    return Math.ceil(7 - diff);
  })();
  const usernameDisabled = usernameCooldownDays > 0;

  const saveField = useCallback(
    async (field: 'fullName' | 'username' | 'email' | 'phone') => {
      if (!accessToken) return;
      setSavingField(field);
      setPhoneError(null);
      try {
        if (field === 'fullName') {
          await onUpdateProfile({ fullName: fullNameVal }, { success: '' });
          setSuccessField('fullName');
          setEditingField(null);
        } else if (field === 'username') {
          if (usernameFormatError) {
            setRequestStatus({ type: 'error', message: t(usernameFormatError) });
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
        if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = setTimeout(() => {
          setSuccessField(null);
          successTimeoutRef.current = null;
        }, TIMEOUTS.successFeedback);
      } catch (e) {
        setRequestStatus({ type: 'error', message: t('common.error') });
      } finally {
        setSavingField(null);
      }
    },
    [accessToken, fullNameVal, usernameVal, emailVal, phoneVal, usernameStatus, user.username, usernameFormatError, onUpdateProfile, setRequestStatus, t]
  );

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    setUploading(true);
    setUploadMessage(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const res = await fetch('/api/user/avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ image: base64 }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setUploadMessage((data?.error as string) || t('profile.avatarUploadFailed'));
            return;
          }
          const avatarUrl = (data as { data?: { avatarUrl?: string } }).data?.avatarUrl ?? (data as { avatarUrl?: string }).avatarUrl;
          await onUpdateProfile({ avatarUrl }, { success: '' });
          setUploadMessage(t('profile.avatarUpdated'));
        } catch {
          setUploadMessage(t('profile.avatarUploadFailed'));
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
      setUploadMessage(t('profile.avatarUploadFailed'));
    }
  };

  const isRtl = i18n.language.startsWith('ar');
  const inputBase = 'w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none transition-colors';

  useUnsavedChanges(editingField !== null);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-[var(--text-muted)]" />
          {t('settings.accountData')}
        </h3>

        {user?.email && !user.isEmailVerified && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning)] mb-4">
            <span className="text-sm text-[var(--warning-text)]">
              {t('settings.emailNotVerified')}
            </span>
            <Button variant="secondary" size="sm" onClick={sendVerification} disabled={verifySending} loading={verifySending}>
              {t('settings.verifyEmail')}
            </Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => document.getElementById('account-avatar-input')?.click()}
              className="relative group"
            >
              <div className="w-20 h-20 rounded-full border-2 border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden flex items-center justify-center">
                {(user as { avatarUrl?: string | null }).avatarUrl ? (
                  <img
                    src={(user as { avatarUrl?: string | null }).avatarUrl!}
                    alt={t('profile.avatarAlt', { name: user?.fullName ?? '' })}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-[var(--text-muted)]" />
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-[var(--text-primary)]">
                {uploading ? t('common.loading') : t('profile.changeAvatar')}
              </div>
            </button>
            <input
              id="account-avatar-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            {uploadMessage && <p className="text-xs text-[var(--text-muted)]">{uploadMessage}</p>}
          </div>

          <div className="flex-1 space-y-4 divide-y divide-[var(--border-subtle)]">
            {(['fullName', 'username', 'email', 'phone'] as const).map((field) => {
              const label = t(`settings.${field === 'fullName' ? 'fullName' : field}`);
              const isEditing = editingField === field;
              const value = field === 'fullName' ? fullNameVal : field === 'username' ? usernameVal : field === 'email' ? emailVal : phoneVal;
              const setValue = field === 'fullName' ? setFullNameVal : field === 'username' ? setUsernameVal : field === 'email' ? setEmailVal : setPhoneVal;
              const isPhone = field === 'phone';
              const isUsername = field === 'username';
              const disabled = isUsername && usernameDisabled;
              const ltrField = isPhone || isUsername || field === 'email';
              return (
                <div key={field} className="pt-4 first:pt-0">
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
                      className={`${inputBase} pl-10 pr-4 ${isRtl ? 'text-right' : ''} ${isEditing ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]/20' : ''}`}
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
                              setValue(field === 'fullName' ? user.fullName ?? '' : field === 'username' ? user.username ?? '' : field === 'email' ? user.email ?? '' : displayPhone(user.phone));
                              setPhoneError(null);
                            }}
                            className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]"
                            aria-label={t('common.cancel')}
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
                            aria-label={t('common.edit')}
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
                      {!usernameFormatError && usernameStatus === 'available' && <span className="text-[var(--success)] flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {t('settings.usernameAvailable')}</span>}
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
      </div>
    </div>
  );
}
