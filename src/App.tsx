import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useNotifications } from './hooks/useNotifications';
import { useTheme } from './hooks/useTheme';
import { useProfileCompletion } from './hooks/useProfileCompletion';
import { useDashboardStats } from './hooks/useDashboardStats';
import { motion, AnimatePresence } from 'motion/react';
import OnboardingWizard from './components/OnboardingWizard';
import PortfolioTracker from './components/PortfolioTracker';
import StockScreener from './components/StockScreener';
import InvestmentCalculator from './components/InvestmentCalculator';
import DelayNotice from './components/DelayNotice';
import GoalsPage from './pages/GoalsPage';
import MarketPage from './pages/MarketPage';
import StockDetailPage from './pages/StockDetailPage';
import ProfilePage from './components/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import AuthPage from './pages/AuthPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { SubscriptionTab, ReferralTab, AchievementsTab, AccountOverviewTab } from './components/features/settings';

export default function App() {
  const { i18n } = useTranslation('common');
  const { isAuthenticated, user, logout, updateUser, accessToken } = useAuthStore();
  const [theme, setTheme] = useTheme(user);
  const { profileCompletion } = useProfileCompletion(isAuthenticated, accessToken);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => (typeof window !== 'undefined' && localStorage.getItem('sidebarCollapsed') === 'true'));
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { notifications, unreadCount: notificationsUnread, notificationsLoading, fetchNotifications, markAllRead: markNotificationsRead, markOneRead: markOneNotificationRead, clearAll: clearAllNotifications } = useNotifications(isAuthenticated);
  const stats = useDashboardStats(isAuthenticated, pathname, accessToken);

  useEffect(() => { localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed)); }, [sidebarCollapsed]);

  const handleThemeChange = async (nextTheme: 'dark' | 'light' | 'system') => {
    setTheme(nextTheme);
    if (accessToken) {
      try {
        const res = await fetch('/api/user/profile', { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: nextTheme }) });
        const body = await res.json().catch(() => null);
        if (res.ok && body) updateUser(body);
      } catch (err) { console.error('Failed to update theme from header', err); }
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
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) { const data = await res.json(); useAuthStore.getState().setAuth(data.user, data.accessToken); }
        else if (isAuthenticated) logout();
      } catch (err) { console.error('Initial auth check failed', err); }
    };
    checkAuth();
  }, [isAuthenticated, logout]);

  useEffect(() => { document.documentElement.dir = i18n.language.startsWith('ar') ? 'rtl' : 'ltr'; document.documentElement.lang = i18n.language; }, [i18n.language]);

  if (isAuthenticated && user?.isFirstLogin) {
    return <OnboardingWizard onComplete={() => updateUser({ isFirstLogin: false, onboardingCompleted: true })} />;
  }
  if (!isAuthenticated && pathname !== '/') return <Navigate to="/" replace />;
  if (!isAuthenticated) return <AuthPage />;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans flex flex-col md:flex-row">
      <Sidebar activeRoute={pathname} onNavigate={navigate} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
      <main className="flex-1 p-8 overflow-y-auto">
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
          onNavigate={navigate}
        />
        <AnimatePresence mode="wait">
          <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <DelayNotice showWhenStockPage={pathname === '/market' || pathname === '/stocks' || pathname.startsWith('/stocks/')} isPro={user?.plan === 'pro' || user?.plan === 'yearly' || false} />
            <Routes>
              <Route path="/" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
              <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
              <Route path="/portfolio" element={<ErrorBoundary><PortfolioTracker /></ErrorBoundary>} />
              <Route path="/stocks" element={<ErrorBoundary><StockScreener onSelectStock={(s) => navigate(`/stocks/${s.ticker}`)} /></ErrorBoundary>} />
              <Route path="/stocks/:ticker" element={<ErrorBoundary><StockDetailPage /></ErrorBoundary>} />
              <Route path="/market" element={<ErrorBoundary><MarketPage onSelectStock={(s) => navigate(`/stocks/${s.ticker}`)} /></ErrorBoundary>} />
              <Route path="/calculator" element={<ErrorBoundary><InvestmentCalculator /></ErrorBoundary>} />
              <Route path="/goals" element={<ErrorBoundary><GoalsPage currentWealth={stats.totalValue} /></ErrorBoundary>} />
              <Route path="/settings" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
              <Route path="/settings/subscription" element={<ErrorBoundary><SubscriptionTab /></ErrorBoundary>} />
              <Route path="/settings/referrals" element={<ErrorBoundary><ReferralTab /></ErrorBoundary>} />
              <Route path="/settings/achievements" element={<ErrorBoundary><AchievementsTab /></ErrorBoundary>} />
              <Route path="/settings/overview" element={<ErrorBoundary><AccountOverviewTab /></ErrorBoundary>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
