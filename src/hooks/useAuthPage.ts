import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { loginSchema, registerSchema, validateRegisterPassword, normalizePhone } from '../lib/validations';
import type { User } from '../types';

export type AuthFormData = { emailOrPhone: string; password: string; fullName?: string };

function ensureUserShape(u: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!u || typeof u !== 'object') return null;
  const id = u.id;
  if (!id || typeof id !== 'string') return null;
  return { ...u, id: String(id), fullName: typeof u.fullName === 'string' ? u.fullName : (u.fullName ?? '') };
}

export function useAuthPage(refCode: string) {
  const { t } = useTranslation('common');
  const setAuth = useAuthStore((s) => s.setAuth);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showTwoFactorInput, setShowTwoFactorInput] = useState(false);
  const [twoFactorOtp, setTwoFactorOtp] = useState('');
  const [twoFaTempToken, setTwoFaTempToken] = useState('');
  const [authMessage, setAuthMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const form = useForm<AuthFormData>({ defaultValues: { emailOrPhone: '', password: '', fullName: '' } });
  const { handleSubmit, setError, reset } = form;

  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) return;
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        try {
          const res = await fetch('/api/auth/me', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            const payload = data?.data ?? data;
            setAuth(payload?.user, payload?.accessToken);
          }
        } catch (err: unknown) {
          if (import.meta.env.DEV) console.error('Failed to sync after Google login', err);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setAuth]);

  const onSubmit = async (data: AuthFormData) => {
    setAuthError('');
    try {
      if (isLogin) {
        const result = loginSchema.safeParse(data);
        if (!result.success) {
          const issue = result.error.issues[0];
          setError((issue.path[0] as keyof AuthFormData) ?? 'emailOrPhone', { message: issue.message });
          return;
        }
      } else {
        const result = registerSchema.safeParse(data);
        if (!result.success) {
          const issue = result.error.issues[0];
          setError((issue.path[0] as keyof AuthFormData) ?? 'emailOrPhone', { message: issue.message });
          return;
        }
        const pwCheck = validateRegisterPassword(data.password, data.emailOrPhone ?? '');
        if (!pwCheck.ok) {
          setError('password', { message: (pwCheck as { ok: false; message: string }).message });
          return;
        }
        if (!(data.emailOrPhone ?? '').includes('@')) {
          const digitsOnly = (data.emailOrPhone ?? '').replace(/\D/g, '');
          if (!digitsOnly) {
            setError('emailOrPhone', { message: t('auth.phoneRequired') });
            return;
          }
          const normalized = normalizePhone(digitsOnly);
          if (normalized.length !== 11 || !/^01[0125][0-9]{8}$/.test(normalized)) {
            setError('emailOrPhone', { message: t('error.invalid_phone') });
            return;
          }
        }
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin
        ? { emailOrPhone: data.emailOrPhone, password: data.password }
        : { emailOrPhone: data.emailOrPhone, password: data.password, fullName: data.fullName ?? '', referralCode: refCode || undefined };
      const res = await fetch(endpoint, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

      let resData: { error?: string; message?: string; data?: { accessToken?: string; user?: unknown; requires2FA?: boolean; tempToken?: string; restored?: boolean } } = {};
      try {
        const text = await res.text();
        if (text) resData = JSON.parse(text) as typeof resData;
      } catch {
        resData = { error: res.status === 429 ? 'Too many requests' : 'Server error' };
      }
      if (!res.ok) {
        let msg = resData.message || resData.error || t('auth.authFailed');
        if (resData.error === 'account_not_found') msg = resData.message || t('auth.accountNotExist');
        else if (resData.error === 'account_locked') msg = resData.message || t('auth.errors.accountLocked');
        else if (resData.error === 'already_registered' || resData.error === 'service_unavailable') msg = resData.message || msg;
        setAuthError(msg);
        return;
      }
      const payload = resData.data ?? (resData as { accessToken?: string; user?: unknown; requires2FA?: boolean; tempToken?: string; restored?: boolean });

      if (isLogin && payload.requires2FA && payload.tempToken) {
        setTwoFaTempToken(payload.tempToken);
        setTwoFactorOtp('');
        setShowTwoFactorInput(true);
        setAuthError('');
        return;
      }

      let profileData = payload.user as Record<string, unknown> | undefined;
      try {
        const profileRes = await fetch('/api/user/profile', { headers: { Authorization: `Bearer ${payload.accessToken}` }, credentials: 'include' });
        if (profileRes.ok) {
          const text = await profileRes.text();
          if (text) {
            const parsed = JSON.parse(text) as { data?: Record<string, unknown> };
            profileData = parsed?.data ?? (parsed as Record<string, unknown>);
          }
        }
      } catch {
        profileData = (payload.user as Record<string, unknown>) ?? profileData;
      }
      const userForAuth = ensureUserShape(profileData ?? (payload.user as Record<string, unknown>));
      if (userForAuth && payload.accessToken) setAuth(userForAuth as unknown as User, payload.accessToken);
      setAuthMessage({
        text: isLogin ? (payload.restored ? t('settings.welcomeBack') : t('auth.loginSuccess')) : t('auth.registerSuccess'),
        type: 'success',
      });
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Auth failed');
    }
  };

  const handleTwoFactorComplete = async (code: string) => {
    if (!twoFaTempToken) return;
    setAuthError('');
    const cleanCode = code.toString().replace(/\s/g, '');
    if (cleanCode.length !== 6) {
      setAuthError(t('settings.enterFullCode'));
      return;
    }
    if (!/^\d{6}$/.test(cleanCode)) {
      setAuthError(t('settings.codeMustBe6Digits'));
      return;
    }
    try {
      const res = await fetch('/api/auth/2fa/authenticate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: twoFaTempToken, code: cleanCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = 'Verification failed';
        if (data.error === 'invalid_code') msg = t('settings.invalidCodeLong');
        else if (data.error === 'invalid_or_expired_token') msg = t('auth.sessionExpired');
        else if (data.message) msg = data.message;
        throw new Error(msg);
      }
      const authPayload = (data as { data?: { accessToken?: string; user?: unknown } })?.data ?? data;
      const accessToken = authPayload?.accessToken ?? (data as { accessToken?: string }).accessToken;
      const profileRes = await fetch('/api/user/profile', { headers: { Authorization: `Bearer ${accessToken}` } });
      const profileJson = profileRes.ok ? await profileRes.json() : { data: authPayload?.user ?? data.user };
      const profileData = (profileJson as { data?: unknown })?.data ?? profileJson;
      setAuth(profileData, accessToken);
      setShowTwoFactorInput(false);
      setTwoFactorOtp('');
      setTwoFaTempToken('');
      setAuthMessage({ text: t('auth.loginSuccess'), type: 'success' });
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      if (!res.ok) throw new Error('Failed to get Google login URL');
      const data = await res.json();
      const url = (data as { data?: { url?: string } })?.data?.url ?? (data as { url?: string }).url;
      const width = 500,
        height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      window.open(url, 'google_login', `width=${width},height=${height},left=${left},top=${top}`);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Google login failed');
    }
  };

  const switchToLogin = () => {
    setIsLogin(true);
    setShowTwoFactorInput(false);
    setAuthError('');
    reset();
  };

  const switchToRegister = () => {
    setIsLogin(false);
    setShowTwoFactorInput(false);
    setAuthError('');
    reset();
  };

  const clearTwoFactor = () => {
    setShowTwoFactorInput(false);
    setTwoFaTempToken('');
    setTwoFactorOtp('');
    setAuthError('');
  };

  return {
    isLogin,
    showPassword,
    setShowPassword,
    showTwoFactorInput,
    twoFactorOtp,
    setTwoFactorOtp,
    authError,
    authMessage,
    form,
    onSubmit,
    handleTwoFactorComplete,
    handleGoogleLogin,
    switchToLogin,
    switchToRegister,
    clearTwoFactor,
  };
}
