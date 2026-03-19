import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import api from './lib/api';
import { useNotifications } from './hooks/useNotifications';
import { useTheme } from './hooks/useTheme';
import { useProfileCompletion } from './hooks/useProfileCompletion';
import { useDashboardStats } from './hooks/useDashboardStats';
import { motion, AnimatePresence } from 'framer-motion';
const OnboardingWizard = lazy(() => import('./components/OnboardingWizard'));
import DelayNotice from './components/DelayNotice';
import DashboardPage from './pages/DashboardPage';
import AuthPage from './pages/AuthPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { ToastContainer } from './components/shared/ToastContainer';
import PageLoader from './components/shared/PageLoader';
import {
  PortfolioSkeleton,
  MarketSkeleton,
  StocksSkeleton,
  StockDetailSkeleton,
  GoalsSkeleton,
  ProfileSkeleton,
  PredictionsSkeleton,
  AIPageSkeleton,
  DiscoverSkeleton,
  CalculatorSkeleton,
  UsernameSetupSkeleton,
} from './components/skeletons';
import { SubscriptionTab, ReferralTab, AchievementsTab, AccountOverviewTab, InvestorProfileTab, AccountSettingsTab, SecuritySettingsTab, PreferencesSettingsTab, NotificationsSettingsTab, DangerSettingsTab } from './components/features/settings';
import SettingsLayout from './components/layout/SettingsLayout';

const PortfolioTracker = lazy(() => import('./components/PortfolioTracker'));
const StockScreener = lazy(() => import('./components/StockScreener'));
const MarketPage = lazy(() => import('./pages/MarketPage'));
const GoalsPage = lazy(() => import('./pages/GoalsPage'));
const InvestmentCalculator = lazy(() => import('./components/InvestmentCalculator'));
const StockDetailPage = lazy(() => import('./pages/StockDetailPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const UsernameSetupPage = lazy(() => import('./pages/UsernameSetupPage'));
const SocialProfilePage = lazy(() => import('./pages/SocialProfilePage'));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage'));
const PredictionsPage = lazy(() => import('./pages/PredictionsPage'));
const AIPage = lazy(() => import('./pages/AIPage'));
const AIAnalyzePage = lazy(() => import('./pages/AIAnalyzePage'));
const AIComparePage = lazy(() => import('./pages/AIComparePage'));
const AIRecommendationsPage = lazy(() => import('./pages/AIRecommendationsPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));

export default function App() {
  const { i18n } = useTranslation('common');
  const { isAuthenticated, user, logout, updateUser } = useAuthStore();
  const [theme, setTheme] = useTheme(user);
  const { profileCompletion } = useProfileCompletion(isAuthenticated);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => (typeof window !== 'undefined' && localStorage.getItem('sidebarCollapsed') === 'true'));
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();
  const pathname = location.pathname;
  const { notifications, unreadCount: notificationsUnread, notificationsLoading, fetchNotifications, markAllRead: markNotificationsRead, markOneRead: markOneNotificationRead, clearAll: clearAllNotifications } = useNotifications(isAuthenticated);
  const stats = useDashboardStats(isAuthenticated, pathname);

  const supportUnreadCount = notifications.filter(n => n.type === 'support_reply' && !n.isRead).length;

  useEffect(() => { localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed)); }, [sidebarCollapsed]);

  const onToggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), []);
  const onCompleteOnboarding = useCallback(() => updateUser({ isFirstLogin: false, onboardingCompleted: true }), [updateUser]);
  const handleThemeChange = async (nextTheme: 'dark' | 'light' | 'system') => {
    setTheme(nextTheme);
    if (!isAuthenticated) return;
    try {
      const res = await api.put('/user/profile', { theme: nextTheme });
      const body = res.data;
      if (body) updateUser((body as { data?: Record<string, unknown> }).data ?? body);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to update theme from header', err);
    }
  };

  const handleLanguageChange = async (lng: 'ar' | 'en') => {
    i18n.changeLanguage(lng);
    if (!isAuthenticated) return;
    try {
      const res = await api.put('/user/profile', { language: lng });
      const body = res.data;
      if (body) updateUser((body as { data?: Record<string, unknown> }).data ?? body);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to update language from header', err);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (user?.language === 'ar' || user?.language === 'en') {
      if (i18n.language !== user.language) i18n.changeLanguage(user.language);
      return;
    }
    const stored = localStorage.getItem('i18nextLng');
    if (stored === 'ar' || stored === 'en') return;
    const navLang = (navigator.language || (Array.isArray(navigator.languages) && navigator.languages[0])) ?? 'en';
    const nextLang = navLang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
    if (i18n.language !== nextLang) i18n.changeLanguage(nextLang);
  }, [user?.language, i18n]);

  useEffect(() => {
    // استخدام ref بدل closure flag عشان نحل مشكلة React StrictMode
    const controller = new AbortController();
    const timeoutMs = 6000;
    let unlocked = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const unlockUI = () => {
      if (unlocked) return;
      unlocked = true;
      setAuthChecked(true); // دايمًا نـunlock الـ UI حتى لو الـ fetch اتعلّق
    };
    const API = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL?.trim();
    const base = API ? `${API.replace(/\/$/, '')}/api` : '/api';

    const checkAuth = async () => {
      // لو السيرفر بطيء/اتعلّق، ما نخليش الصفحة loading للأبد
      timeoutId = setTimeout(() => {
        controller.abort();
        unlockUI();
      }, timeoutMs);
      try {
        const res = await fetch(`${base}/auth/me`, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (res.ok) {
          const data = await res.json();
          const p = (data as { data?: { user?: unknown; accessToken?: string } })?.data ?? data;
          const userPayload  = (p as { user?: unknown })?.user  ?? (data as { user?: unknown }).user;
          const accessToken  = (p as { accessToken?: string })?.accessToken ?? (data as { accessToken?: string }).accessToken;
          if (userPayload && typeof accessToken === 'string') {
            useAuthStore.getState().setAuth(userPayload as import('./types').User, accessToken);
          }
        } else if (res.status === 401) {
          useAuthStore.getState().logout();
        }
      } catch (err) {
        // timeout أو network error → نبقي الجلسة الموجودة ولا نعمل logout
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
    return () => {
      controller.abort();
      if (timeoutId) clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { document.documentElement.dir = i18n.language.startsWith('ar') ? 'rtl' : 'ltr'; document.documentElement.lang = i18n.language; }, [i18n.language]);

  // لو المستخدم مكانش logged in قبل كده → انتظر التحقق
  // لو كان logged in → اعرض الأبلكيشن فورًا والـ checkAuth يشتغل في الخلفية
  if (!authChecked && !isAuthenticated) return <PageLoader />;

  if (isAuthenticated && user?.isFirstLogin) {
    return (
      <Suspense fallback={<PageLoader />}>
        <OnboardingWizard onComplete={onCompleteOnboarding} />
      </Suspense>
    );
  }
  if (isAuthenticated && !user?.username) {
    return <Navigate to="/setup-username" replace />;
  }
  if (!isAuthenticated && pathname !== '/') return <Navigate to="/" replace />;
  if (!isAuthenticated) return <AuthPage />;

  return (
    <div className="min-h-screen w-full max-w-[100vw] bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans flex flex-col md:flex-row overflow-x-hidden">
      <ToastContainer />
      <Sidebar activeRoute={pathname} collapsed={sidebarCollapsed} onToggle={onToggleSidebar} supportUnreadCount={supportUnreadCount} />
      <main className="main-content flex-1 p-4 sm:p-6 md:p-8 pb-20 md:pb-8 overflow-y-auto overflow-x-hidden">
        <Header
          user={user ?? null}
          notifications={notifications}
          unreadCount={notificationsUnread}
          notificationsLoading={notificationsLoading}
          fetchNotifications={fetchNotifications}
          markAllRead={markNotificationsRead}
          markOneRead={markOneNotificationRead}
          clearAll={clearAllNotifications}
          onLogout={logout}
          theme={theme}
          onThemeChange={handleThemeChange}
          profileCompletion={profileCompletion}
        />
        <AnimatePresence mode="wait">
          <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <DelayNotice showWhenStockPage={pathname === '/market' || pathname === '/stocks' || pathname.startsWith('/stocks/')} isPro={user?.plan === 'pro' || user?.plan === 'yearly' || false} />
            <Routes>
                <Route path="/" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
                <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
                <Route path="/portfolio" element={<ErrorBoundary><Suspense fallback={<PortfolioSkeleton />}><PortfolioTracker /></Suspense></ErrorBoundary>} />
                <Route path="/stocks" element={<ErrorBoundary><Suspense fallback={<StocksSkeleton />}><StockScreener /></Suspense></ErrorBoundary>} />
                <Route path="/stocks/:ticker" element={<ErrorBoundary><Suspense fallback={<StockDetailSkeleton />}><StockDetailPage /></Suspense></ErrorBoundary>} />
                <Route path="/market" element={<ErrorBoundary><Suspense fallback={<MarketSkeleton />}><MarketPage /></Suspense></ErrorBoundary>} />
                <Route path="/calculator" element={<ErrorBoundary><Suspense fallback={<CalculatorSkeleton />}><InvestmentCalculator /></Suspense></ErrorBoundary>} />
                <Route path="/goals" element={<ErrorBoundary><Suspense fallback={<GoalsSkeleton />}><GoalsPage currentWealth={stats.totalValue} /></Suspense></ErrorBoundary>} />
                <Route path="/settings" element={<ErrorBoundary><SettingsLayout /></ErrorBoundary>}>
                  <Route index element={<Navigate to="/settings/account" replace />} />
                  <Route path="account" element={<AccountSettingsTab />} />
                  <Route path="security" element={<SecuritySettingsTab />} />
                  <Route path="preferences" element={<PreferencesSettingsTab />} />
                  <Route path="notifications" element={<NotificationsSettingsTab />} />
                  <Route path="danger" element={<DangerSettingsTab />} />
                  <Route path="overview" element={<AccountOverviewTab />} />
                  <Route path="investor" element={<InvestorProfileTab />} />
                  <Route path="subscription" element={<SubscriptionTab />} />
                  <Route path="referrals" element={<ReferralTab />} />
                  <Route path="achievements" element={<AchievementsTab />} />
                </Route>
                <Route path="/profile" element={<ErrorBoundary><Suspense fallback={<ProfileSkeleton />}><ProfilePage /></Suspense></ErrorBoundary>} />
                <Route path="/profile/:username" element={<ErrorBoundary><Suspense fallback={<ProfileSkeleton />}><SocialProfilePage /></Suspense></ErrorBoundary>} />
                <Route path="/setup-username" element={<ErrorBoundary><Suspense fallback={<UsernameSetupSkeleton />}><UsernameSetupPage /></Suspense></ErrorBoundary>} />
                <Route path="/discover" element={<ErrorBoundary><Suspense fallback={<DiscoverSkeleton />}><DiscoverPage /></Suspense></ErrorBoundary>} />
                <Route path="/predictions" element={<ErrorBoundary><Suspense fallback={<PredictionsSkeleton />}><PredictionsPage /></Suspense></ErrorBoundary>} />
                <Route path="/ai" element={<ErrorBoundary><Suspense fallback={<AIPageSkeleton />}><AIPage /></Suspense></ErrorBoundary>} />
                <Route path="/ai/analyze" element={<ErrorBoundary><Suspense fallback={<AIPageSkeleton />}><AIAnalyzePage /></Suspense></ErrorBoundary>} />
                <Route path="/ai/compare" element={<ErrorBoundary><Suspense fallback={<AIPageSkeleton />}><AIComparePage /></Suspense></ErrorBoundary>} />
                <Route path="/ai/recommendations" element={<ErrorBoundary><Suspense fallback={<AIPageSkeleton />}><AIRecommendationsPage /></Suspense></ErrorBoundary>} />
                <Route path="/support" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><SupportPage /></Suspense></ErrorBoundary>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
}
