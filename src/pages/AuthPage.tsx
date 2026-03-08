import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, TrendingUp, Eye, EyeOff, Smartphone } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { OTPInput } from '../components/ui/OTPInput';
import { loginSchema, registerSchema, validateRegisterPassword, normalizePhone } from '../lib/validations';
import type { User } from '../types';

type AuthFormData = {
  emailOrPhone: string;
  password: string;
  fullName?: string;
};

function ensureUserShape(u: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!u || typeof u !== 'object') return null;
  const id = u.id;
  if (!id || typeof id !== 'string') return null;
  return {
    ...u,
    id: String(id),
    fullName: typeof u.fullName === 'string' ? u.fullName : (u.fullName ?? ''),
  };
}

export default function AuthPage() {
  const { t, i18n } = useTranslation('common');
  const setAuth = useAuthStore((s) => s.setAuth);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showTwoFactorInput, setShowTwoFactorInput] = useState(false);
  const [twoFactorOtp, setTwoFactorOtp] = useState('');
  const [twoFaTempToken, setTwoFaTempToken] = useState('');
  const [authMessage, setAuthMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<AuthFormData>({
    defaultValues: { emailOrPhone: '', password: '', fullName: '' },
  });

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) return;
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        try {
          const res = await fetch('/api/auth/me', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            setAuth(data.user, data.accessToken);
          }
        } catch (err) {
          console.error('Failed to sync after Google login', err);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
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
      const body = isLogin ? { emailOrPhone: data.emailOrPhone, password: data.password } : { emailOrPhone: data.emailOrPhone, password: data.password, fullName: data.fullName ?? '' };
      const res = await fetch(endpoint, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

      let resData: { error?: string; message?: string; accessToken?: string; user?: unknown; requires2FA?: boolean; tempToken?: string; restored?: boolean } = {};
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

      if (isLogin && resData.requires2FA && resData.tempToken) {
        setTwoFaTempToken(resData.tempToken);
        setTwoFactorOtp('');
        setShowTwoFactorInput(true);
        setAuthError('');
        return;
      }

      let profileData = resData.user as Record<string, unknown> | undefined;
      try {
        const profileRes = await fetch('/api/user/profile', { headers: { Authorization: `Bearer ${resData.accessToken}` }, credentials: 'include' });
        if (profileRes.ok) {
          const text = await profileRes.text();
          if (text) profileData = JSON.parse(text) as Record<string, unknown>;
        }
      } catch {
        profileData = (resData.user as Record<string, unknown>) ?? profileData;
      }
      const userForAuth = ensureUserShape(profileData ?? (resData.user as Record<string, unknown>));
      if (userForAuth && resData.accessToken) setAuth(userForAuth as unknown as User, resData.accessToken);
      setAuthMessage({
        text: isLogin ? (resData.restored ? t('settings.welcomeBack') : t('auth.loginSuccess')) : t('auth.registerSuccess'),
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
    if (cleanCode.length !== 6) { setAuthError(t('settings.enterFullCode')); return; }
    if (!/^\d{6}$/.test(cleanCode)) { setAuthError(t('settings.codeMustBe6Digits')); return; }
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
      const profileRes = await fetch('/api/user/profile', { headers: { Authorization: `Bearer ${data.accessToken}` } });
      const profileData = profileRes.ok ? await profileRes.json() : data.user;
      setAuth(profileData, data.accessToken);
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
      const { url } = await res.json();
      const width = 500, height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      window.open(url, 'google_login', `width=${width},height=${height},left=${left},top=${top}`);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Google login failed');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 font-sans text-[var(--text-primary)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <TrendingUp className="w-12 h-12 text-[var(--brand)] mx-auto mb-4" />
          <h1 className="text-4xl font-bold tracking-tight mb-2">EGX Pro</h1>
          <p className="text-[var(--text-muted)]">Egyptian Stock Market Intelligence</p>
        </div>

        <motion.div layout className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-[var(--shadow-xl)] card-elevated">
          <div className="flex gap-4 mb-8 p-1 bg-[var(--bg-secondary)] rounded-2xl">
            <Button fullWidth variant={isLogin ? 'primary' : 'ghost'} size="md" onClick={() => { setIsLogin(true); setShowTwoFactorInput(false); setAuthError(''); reset(); }}>
              {t('auth.login')}
            </Button>
            <Button fullWidth variant={!isLogin ? 'primary' : 'ghost'} size="md" onClick={() => { setIsLogin(false); setShowTwoFactorInput(false); setAuthError(''); reset(); }}>
              {t('auth.register')}
            </Button>
          </div>

          {showTwoFactorInput ? (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="bg-[var(--brand-subtle)] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8 text-[var(--brand)]" />
                </div>
                <h3 className="text-xl font-bold mb-2">{t('auth.enterVerificationCode')}</h3>
                <p className="text-[var(--text-muted)] text-sm">{t('auth.twoFactorDesc')}</p>
              </div>
              <OTPInput value={twoFactorOtp} onChange={setTwoFactorOtp} onComplete={handleTwoFactorComplete} error={!!authError} />
              {authError && <p className="text-[var(--danger)] text-sm bg-[var(--danger-bg)] p-3 rounded-xl border border-[var(--danger)]/20 text-center">{authError}</p>}
              <Button type="button" variant="ghost" fullWidth onClick={() => { setShowTwoFactorInput(false); setTwoFaTempToken(''); setTwoFactorOtp(''); setAuthError(''); }}>
                ← {t('auth.backToLogin')}
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <Input {...register('fullName')} label={t('auth.fullName')} type="text" placeholder="Ahmed Mohamed" autoComplete="name" disabled={isSubmitting} error={errors.fullName?.message} />
                    </motion.div>
                  )}
                </AnimatePresence>
                <Input {...register('emailOrPhone')} label={t('auth.emailOrPhone')} type="text" autoComplete="username" placeholder={t('auth.placeholderEmailPhone')} disabled={isSubmitting} error={errors.emailOrPhone?.message} />
                <div className="relative">
                  <Input {...register('password')} label={t('auth.password')} type={showPassword ? 'text' : 'password'} autoComplete={isLogin ? 'current-password' : 'new-password'} placeholder="••••••" disabled={isSubmitting} error={errors.password?.message} />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-9 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </Button>
                </div>
                {authMessage && <p className={`text-body p-3 rounded-xl border text-center ${authMessage.type === 'success' ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20' : 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]/20'}`}>{authMessage.text}</p>}
                {authError && <p className="text-[var(--danger)] text-body bg-[var(--danger-bg)] p-3 rounded-xl border border-[var(--danger)]/20">{authError}</p>}
                <Button type="submit" fullWidth size="lg" disabled={isSubmitting} loading={isSubmitting} icon={isSubmitting ? undefined : (isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)} iconPosition="left"
                  className="flex items-center justify-center gap-2">
                  {isSubmitting ? t('auth.loading') : (isLogin ? t('auth.login') : t('auth.register'))}
                </Button>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border)]" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-[var(--bg-primary)] px-2 text-[var(--text-muted)]">{t('auth.or')}</span></div>
                </div>
                <Button type="button" variant="secondary" fullWidth size="lg" onClick={handleGoogleLogin}
                  icon={<svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>} iconPosition="left">
                  {t('auth.continueGoogle')}
                </Button>
              </form>
            </>
          )}

          <div className="mt-8 pt-8 border-t border-[var(--border)] flex justify-center gap-4">
            <Button variant="link" size="sm" onClick={() => i18n.changeLanguage('ar')} className={i18n.language.startsWith('ar') ? 'font-bold' : ''}>العربية</Button>
            <Button variant="link" size="sm" onClick={() => i18n.changeLanguage('en')} className={i18n.language === 'en' ? 'font-bold' : ''}>English</Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
