import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import PageLoader from './components/shared/PageLoader';

const OnboardingWizard   = lazy(() => import('./components/features/onboarding/OnboardingWizard'));
const AuthPage           = lazy(() => import('./pages/AuthPage'));
const AuthenticatedApp   = lazy(() => import('./AuthenticatedApp'));

/** Skeleton shown while AuthPage chunk loads — contains the LCP <h1> so it appears as early as possible */
function AuthSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div style={{ width: '100%', maxWidth: '28rem' }}>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-0">Borsa</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Stock Market Intelligence</p>
        </div>
        <div className="rounded-3xl p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: '18rem' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <div className="skeleton-shimmer" style={{ flex: 1, height: 40, borderRadius: 12 }} />
            <div className="skeleton-shimmer" style={{ flex: 1, height: 40, borderRadius: 12 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="skeleton-shimmer" style={{ height: 48, borderRadius: 12 }} />
            <div className="skeleton-shimmer" style={{ height: 48, borderRadius: 12 }} />
            <div className="skeleton-shimmer" style={{ height: 52, borderRadius: 12, marginTop: 8 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { i18n } = useTranslation('common');
  const { isAuthenticated, user, updateUser } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();
  const pathname = location.pathname;

  const onCompleteOnboarding = useCallback(
    () => updateUser({ isFirstLogin: false, onboardingCompleted: true }),
    [updateUser],
  );

  useEffect(() => {
    document.documentElement.dir  = i18n.language.startsWith('ar') ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutMs  = 6000;
    let unlocked     = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const unlockUI = () => {
      if (unlocked) return;
      unlocked = true;
      setAuthChecked(true);
    };

    const API  = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL?.trim();
    const base = API ? `${API.replace(/\/$/, '')}/api` : '/api';

    const checkAuth = async () => {
      timeoutId = setTimeout(() => { controller.abort(); unlockUI(); }, timeoutMs);
      try {
        const res = await fetch(`${base}/auth/me`, { credentials: 'include', signal: controller.signal });

        if (res.ok) {
          const data = await res.json();
          const p            = (data as { data?: { user?: unknown; accessToken?: string } })?.data ?? data;
          const userPayload  = (p as { user?: unknown })?.user  ?? (data as { user?: unknown }).user;
          const accessToken  = (p as { accessToken?: string })?.accessToken ?? (data as { accessToken?: string }).accessToken;
          if (userPayload && typeof accessToken === 'string') {
            useAuthStore.getState().setAuth(userPayload as import('./types').User, accessToken);
            // Pre-fetch the authenticated shell so it's ready when React renders it
            void import('./AuthenticatedApp');
          }
        } else if (res.status === 403) {
          const data  = await res.json().catch(() => ({}));
          const error = (data as { error?: string })?.error ?? (data as { data?: { error?: string } })?.data?.error;
          if (error === 'ACCOUNT_SUSPENDED') {
            useAuthStore.getState().logout();
            window.location.replace('/banned');
            return;
          }
        } else if (res.status === 401) {
          useAuthStore.getState().logout();
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          const isTimeout = (err as { name?: string })?.name === 'AbortError';
          console.warn(isTimeout ? 'checkAuth: timeout, keeping session' : 'checkAuth: network error, keeping session');
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        unlockUI();
      }
    };

    checkAuth();
    return () => { controller.abort(); if (timeoutId) clearTimeout(timeoutId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // For non-root paths: wait for auth check so deep links restore sessions correctly.
  // For root path (/): show AuthSkeleton immediately — lets LCP <h1> paint before the API round-trip.
  if (!authChecked && !isAuthenticated && pathname !== '/') return <PageLoader />;

  if (isAuthenticated && user?.isFirstLogin) {
    return (
      <Suspense fallback={<PageLoader />}>
        <OnboardingWizard onComplete={onCompleteOnboarding} />
      </Suspense>
    );
  }
  if (isAuthenticated && !user?.username) return <Navigate to="/setup-username" replace />;
  if (!isAuthenticated && pathname !== '/') return <Navigate to="/" replace />;
  if (!isAuthenticated) return <Suspense fallback={<AuthSkeleton />}><AuthPage /></Suspense>;

  return (
    <Suspense fallback={<PageLoader />}>
      <AuthenticatedApp />
    </Suspense>
  );
}
