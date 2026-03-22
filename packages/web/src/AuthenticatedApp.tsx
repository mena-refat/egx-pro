import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import api from './lib/api';
import { useNotifications } from './hooks/useNotifications';
import { useTheme } from './hooks/useTheme';
import { useProfileCompletion } from './hooks/useProfileCompletion';
import { useDashboardStats } from './hooks/useDashboardStats';
import DelayNotice from './components/shared/DelayNotice';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import { ToastContainer } from './components/shared/ToastContainer';
import { AppRoutes } from './routes';

export default function AuthenticatedApp() {
  const { i18n } = useTranslation('common');
  const { user, logout, updateUser } = useAuthStore();
  const [theme, setTheme] = useTheme(user);
  const { profileCompletion } = useProfileCompletion(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() =>
    typeof window !== 'undefined' && localStorage.getItem('sidebarCollapsed') === 'true',
  );
  const location = useLocation();
  const pathname = location.pathname;
  const {
    notifications,
    unreadCount: notificationsUnread,
    notificationsLoading,
    fetchNotifications,
    markAllRead: markNotificationsRead,
    markOneRead: markOneNotificationRead,
    clearAll: clearAllNotifications,
  } = useNotifications(true);
  const stats = useDashboardStats(true, pathname);

  const supportUnreadCount = notifications.filter(n => n.type === 'support_reply' && !n.isRead).length;

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Sync language from user profile (authenticated context)
  useEffect(() => {
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

  const onToggleSidebar = useCallback(() => setSidebarCollapsed(c => !c), []);

  const handleThemeChange = async (nextTheme: 'dark' | 'light' | 'system') => {
    setTheme(nextTheme);
    try {
      const res = await api.put('/user/profile', { theme: nextTheme });
      const body = res.data;
      if (body) updateUser((body as { data?: Record<string, unknown> }).data ?? body);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to update theme from header', err);
    }
  };

  return (
    <div className="h-screen w-full max-w-[100vw] bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans flex flex-col md:flex-row overflow-hidden">
      <ToastContainer />
      <Sidebar
        activeRoute={pathname}
        collapsed={sidebarCollapsed}
        onToggle={onToggleSidebar}
        supportUnreadCount={supportUnreadCount}
      />
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
        <div key={pathname} className="page-fade-in">
          <DelayNotice
            showWhenStockPage={pathname === '/market' || pathname === '/stocks' || pathname.startsWith('/stocks/')}
            isPro={user?.plan === 'pro' || user?.plan === 'yearly' || false}
          />
          <AppRoutes currentWealth={stats.totalValue} />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
