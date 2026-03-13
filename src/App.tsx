import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useNotifications } from './hooks/useNotifications';
import { useTheme } from './hooks/useTheme';
import { useProfileCompletion } from './hooks/useProfileCompletion';
import { useDashboardStats } from './hooks/useDashboardStats';
import { motion, AnimatePresence } from 'framer-motion';
import OnboardingWizard from './components/OnboardingWizard';
import DelayNotice from './components/DelayNotice';
import DashboardPage from './pages/DashboardPage';
import AuthPage from './pages/AuthPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { ToastContainer } from './components/shared/ToastContainer';
import PageLoader from './components/shared/PageLoader';
import { SubscriptionTab, ReferralTab, AchievementsTab, AccountOverviewTab } from './components/features/settings';
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

export default function App() {
  const { i18n } = useTranslation('common');
  const { isAuthenticated, user, logout, updateUser, accessToken } = useAuthStore();
  const [theme, setTheme] = useTheme(user);
  const { profileCompletion } = useProfileCompletion(isAuthenticated);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => (typeof window !== 'undefined' && localStorage.getItem('sidebarCollapsed') === 'true'));
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { notifications, unreadCount: notificationsUnread, notificationsLoading, fetchNotifications, markAllRead: markNotificationsRead, markOneRead: markOneNotificationRead, clearAll: clearAllNotifications } = useNotifications(isAuthenticated);
  const stats = useDashboardStats(isAuthenticated, pathname);

  useEffect(() => { localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed)); }, [sidebarCollapsed]);

  const onToggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), []);
  const onCompleteOnboarding = useCallback(() => updateUser({ isFirstLogin: false, onboardingCompleted: true }), [updateUser]);
  const handleThemeChange = async (nextTheme: 'dark' | 'light' | 'system') => {
    setTheme(nextTheme);
    if (accessToken) {
      try {
        const res = await fetch('/api/user/profile', { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: nextTheme }) });
        const body = await res.json().catch(() => null);
        if (res.ok && body) updateUser((body as { data?: Record<string, unknown> }).data ?? body);
      } catch (err) { if (import.meta.env.DEV) console.error('Failed to update theme from header', err); }
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

  const hasCheckedAuth = useRef(false);
  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const p = (data as { data?: { user?: unknown; accessToken?: string } })?.data ?? data;
          const userPayload = p?.user ?? (data as { user?: unknown }).user;
          const accessTokenPayload = p?.accessToken ?? (data as { accessToken?: string }).accessToken;
          if (userPayload && typeof accessTokenPayload === 'string') useAuthStore.getState().setAuth(userPayload as import('./types').User, accessTokenPayload);
        }
        else if (isAuthenticated) logout();
      } catch (err) { if (import.meta.env.DEV) console.error('Initial auth check failed', err); }
    };
    checkAuth();
  }, [isAuthenticated, logout]);

  useEffect(() => { document.documentElement.dir = i18n.language.startsWith('ar') ? 'rtl' : 'ltr'; document.documentElement.lang = i18n.language; }, [i18n.language]);

  if (isAuthenticated && user?.isFirstLogin) {
    return <OnboardingWizard onComplete={onCompleteOnboarding} />;
  }
  if (isAuthenticated && !user?.username) {
    return <Navigate to="/setup-username" replace />;
  }
  if (!isAuthenticated && pathname !== '/') return <Navigate to="/" replace />;
  if (!isAuthenticated) return <AuthPage />;

  return (
    <div className="min-h-screen w-full max-w-[100vw] bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans flex flex-col md:flex-row overflow-x-hidden">
      <ToastContainer />
      <Sidebar activeRoute={pathname} collapsed={sidebarCollapsed} onToggle={onToggleSidebar} />
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
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
                <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
                <Route path="/portfolio" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><PortfolioTracker /></Suspense></ErrorBoundary>} />
                <Route path="/stocks" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><StockScreener /></Suspense></ErrorBoundary>} />
                <Route path="/stocks/:ticker" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><StockDetailPage /></Suspense></ErrorBoundary>} />
                <Route path="/market" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><MarketPage /></Suspense></ErrorBoundary>} />
                <Route path="/calculator" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><InvestmentCalculator /></Suspense></ErrorBoundary>} />
                <Route path="/goals" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><GoalsPage currentWealth={stats.totalValue} /></Suspense></ErrorBoundary>} />
                <Route path="/settings" element={<ErrorBoundary><SettingsLayout /></ErrorBoundary>}>
                  <Route index element={<Navigate to="/settings/account" replace />} />
                  <Route path="account" element={<AccountOverviewTab />} />
                  <Route path="subscription" element={<SubscriptionTab />} />
                  <Route path="referrals" element={<ReferralTab />} />
                  <Route path="achievements" element={<AchievementsTab />} />
                </Route>
                <Route path="/profile" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><ProfilePage /></Suspense></ErrorBoundary>} />
                <Route path="/profile/:username" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><SocialProfilePage /></Suspense></ErrorBoundary>} />
                <Route path="/setup-username" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><UsernameSetupPage /></Suspense></ErrorBoundary>} />
                <Route path="/discover" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><DiscoverPage /></Suspense></ErrorBoundary>} />
                <Route path="/predictions" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><PredictionsPage /></Suspense></ErrorBoundary>} />
                <Route path="/ai" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><AIPage /></Suspense></ErrorBoundary>} />
                <Route path="/ai/analyze" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><AIAnalyzePage /></Suspense></ErrorBoundary>} />
                <Route path="/ai/compare" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><AIComparePage /></Suspense></ErrorBoundary>} />
                <Route path="/ai/recommendations" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><AIRecommendationsPage /></Suspense></ErrorBoundary>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
}
