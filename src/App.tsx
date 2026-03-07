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
import StockAnalysis from './components/StockAnalysis';
import DelayNotice from './components/DelayNotice';
import GoalsPage from './pages/GoalsPage';
import MarketPage from './pages/MarketPage';
import ProfilePage from './components/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import AuthPage from './pages/AuthPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Stock } from './types';

export default function App() {
  const { i18n } = useTranslation('common');
  const { isAuthenticated, user, logout, updateUser, accessToken } = useAuthStore();
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [theme, setTheme] = useTheme(user);
  const { profileCompletion } = useProfileCompletion(isAuthenticated, accessToken);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => (typeof window !== 'undefined' && localStorage.getItem('sidebarCollapsed') === 'true'));
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { notifications, unreadCount: notificationsUnread, fetchNotifications, markAllRead: markNotificationsRead, markOneRead: markOneNotificationRead, clearAll: clearAllNotifications } = useNotifications(isAuthenticated);
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

  useEffect(() => { document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = i18n.language; }, [i18n.language]);

  if (isAuthenticated && user?.isFirstLogin) {
    return <OnboardingWizard onComplete={() => updateUser({ isFirstLogin: false, onboardingCompleted: true })} />;
  }
  if (!isAuthenticated && pathname !== '/') return <Navigate to="/" replace />;
  if (!isAuthenticated) return <AuthPage />;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans flex flex-col md:flex-row">
      <Sidebar activeRoute={pathname} onNavigate={(path) => { navigate(path); setSelectedStock(null); }} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
      <main className="flex-1 p-8 overflow-y-auto">
        <Header
          user={user ?? null}
          notifications={notifications}
          unreadCount={notificationsUnread}
          fetchNotifications={fetchNotifications}
          markAllRead={markNotificationsRead}
          markOneRead={markOneNotificationRead}
          clearAll={clearAllNotifications}
          onLogout={logout}
          theme={theme}
          onThemeChange={handleThemeChange}
          profileCompletion={profileCompletion}
          onNavigate={(path) => { if (path === '/stocks') setSelectedStock(null); navigate(path); }}
        />
        <AnimatePresence mode="wait">
          <motion.div key={pathname + (selectedStock ? `-${selectedStock.ticker}` : '')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <DelayNotice showWhenStockPage={pathname === '/market' || pathname === '/stocks' || pathname.startsWith('/stocks/') || !!selectedStock} isPro={user?.plan === 'pro' || user?.plan === 'yearly' || false} />
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/portfolio" element={<PortfolioTracker />} />
              <Route path="/stocks" element={selectedStock ? <StockAnalysis stock={selectedStock} onBack={() => setSelectedStock(null)} /> : <StockScreener onSelectStock={(s) => setSelectedStock(s)} />} />
              <Route path="/market" element={<MarketPage onSelectStock={(s) => setSelectedStock(s)} />} />
              <Route path="/calculator" element={<InvestmentCalculator />} />
              <Route path="/goals" element={<GoalsPage currentWealth={stats.totalValue} />} />
              <Route path="/settings" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
