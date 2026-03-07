import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Settings as SettingsIcon, Sun, Moon, Monitor, Target, Bell, LogOut, Trophy, Briefcase, UserPlus as UserPlusIcon, ChevronRight } from 'lucide-react';
import type { NotificationItem } from '../../hooks/useNotifications';
import { NotificationDropdown } from '../features/notifications/NotificationDropdown';

type User = { fullName?: string; username?: string; avatarUrl?: string };

export type HeaderProps = {
  user: User | null;
  notifications: NotificationItem[];
  unreadCount: number;
  notificationsLoading?: boolean;
  fetchNotifications: () => void;
  markAllRead: () => void;
  markOneRead: (id: string) => void;
  clearAll: () => void;
  onLogout: () => void;
  theme: 'dark' | 'light' | 'system';
  onThemeChange: (t: 'dark' | 'light' | 'system') => void;
  profileCompletion?: { percentage: number; missing: { field: string; route: string }[] } | null;
  onNavigate: (path: string) => void;
};

export function Header({
  user,
  notifications,
  unreadCount,
  notificationsLoading = false,
  fetchNotifications,
  markAllRead,
  markOneRead,
  clearAll,
  onLogout,
  theme,
  onThemeChange,
  profileCompletion,
  onNavigate,
}: HeaderProps) {
  const { t, i18n } = useTranslation('common');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [profileCompletionOpen, setProfileCompletionOpen] = useState(false);
  const [confirmClearNotifications, setConfirmClearNotifications] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const completionDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) setUserDropdownOpen(false);
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) setNotificationsOpen(false);
      if (completionDropdownRef.current && !completionDropdownRef.current.contains(e.target as Node)) setProfileCompletionOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const goToSettings = () => { onNavigate('/settings'); setUserDropdownOpen(false); };

  const goToNotificationTarget = (type: string) => {
    setNotificationsOpen(false);
    if (type === 'achievement') onNavigate('/settings?tab=achievements');
    else if (type === 'stock_target') onNavigate('/stocks');
    else if (type === 'referral') onNavigate('/settings?tab=referral');
    else if (type === 'goal') onNavigate('/goals');
    else if (type === 'portfolio') onNavigate('/portfolio');
  };

  return (
    <header className="flex justify-between items-center mb-6 flex-wrap gap-3" dir={i18n.language.startsWith('ar') ? 'rtl' : 'ltr'}>
      <div className="text-end">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          {t('header.welcomeUser', { name: user?.fullName || t('header.defaultUser') })}
        </h2>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {profileCompletion != null && profileCompletion.percentage < 100 && (
          <div className="relative" ref={completionDropdownRef}>
            <button
              type="button"
              onClick={() => setProfileCompletionOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--brand-subtle)] hover:opacity-90 transition-colors"
            >
              <div className="w-12 h-1.5 bg-[var(--border)] rounded-full overflow-hidden shrink-0">
                <div className="h-full bg-[var(--brand)] rounded-full" style={{ width: `${profileCompletion.percentage}%` }} />
              </div>
              <span className="text-xs font-bold text-[var(--brand-text)] whitespace-nowrap">{profileCompletion.percentage}%</span>
              <span className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap hidden sm:inline">{t('overview.completeProfile')}</span>
              <ChevronRight className={`w-4 h-4 text-[var(--brand-text)] shrink-0 ${profileCompletionOpen ? 'rotate-90' : ''} ${i18n.language.startsWith('ar') ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {profileCompletionOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-md)] z-50 overflow-hidden rtl:right-auto rtl:left-0"
                >
                  <div className="p-3 border-b border-[var(--border-subtle)]">
                    <p className="text-sm font-medium text-[var(--text-secondary)]">{t('overview.profileCompletePercent', { p: profileCompletion.percentage })}</p>
                    <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-[var(--brand)] rounded-full transition-[width]" style={{ width: `${profileCompletion.percentage}%` }} />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-[var(--text-muted)] mb-2">{t('overview.missingLabel')}</p>
                    <ul className="space-y-1.5">
                      {profileCompletion.missing.map((m) => {
                        const label = m.field === 'email' ? t('overview.missingEmail') : m.field === 'phone' ? t('overview.missingPhone') : m.field === 'username' ? t('overview.missingUsername') : m.field === 'goal' ? t('overview.missingGoal') : t('overview.missingWatchlist');
                        return (
                          <li key={m.field} className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-[var(--text-secondary)]">{label}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setProfileCompletionOpen(false);
                                onNavigate(m.route.startsWith('/profile') ? m.route.replace('/profile', '/settings') : m.route);
                              }}
                              className="text-xs font-medium text-[var(--brand-text)] hover:opacity-80 flex items-center gap-0.5"
                            >
                              {t('overview.add')}
                              <ChevronRight className={`w-3 h-3 ${i18n.language.startsWith('ar') ? 'rotate-180' : ''}`} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex items-center gap-1 rounded-full bg-[var(--bg-card)] border border-[var(--border)] px-1 py-1 text-[var(--text-muted)] text-xs">
          <button type="button" onClick={() => onThemeChange('light')} className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${theme === 'light' ? 'bg-[var(--brand)] text-[var(--text-inverse)]' : 'bg-transparent hover:bg-[var(--bg-card-hover)]'}`} aria-label="Light mode"><Sun className="w-4 h-4" /></button>
          <button type="button" onClick={() => onThemeChange('system')} className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${theme === 'system' ? 'bg-[var(--text-inverse)] text-[var(--text-primary)]' : 'bg-transparent hover:bg-[var(--bg-card-hover)]'}`} aria-label="System theme"><Monitor className="w-4 h-4" /></button>
          <button type="button" onClick={() => onThemeChange('dark')} className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${theme === 'dark' ? 'bg-[var(--brand)] text-[var(--text-inverse)]' : 'bg-transparent hover:bg-[var(--bg-card-hover)]'}`} aria-label="Dark mode"><Moon className="w-4 h-4" /></button>
        </div>

        <div className="relative" ref={notificationsRef}>
          <button type="button" onClick={() => { setNotificationsOpen((o) => !o); if (!notificationsOpen) fetchNotifications(); }} className="relative p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]" aria-label={t('settings.notifications')}>
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" aria-hidden />}
          </button>
          <AnimatePresence>
            {notificationsOpen && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute left-0 top-full mt-2 w-80 max-h-96 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-md)] z-[100] flex flex-col">
                <div className="shrink-0 border-b border-[var(--border-subtle)] px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[var(--text-secondary)]">{t('settings.notifications')}</span>
                    <button type="button" onClick={() => setConfirmClearNotifications(true)} className="text-xs text-[var(--brand-text)] hover:opacity-80">{t('settings.clearAllNotifications')}</button>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button type="button" onClick={markAllRead} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">{t('settings.markAllAsRead')}</button>
                  </div>
                  {confirmClearNotifications && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--bg-secondary)] px-3 py-2 text-xs">
                      <span className="text-[var(--text-secondary)]">{t('settings.confirmClearNotifications')}</span>
                      <button type="button" onClick={() => { clearAll(); setConfirmClearNotifications(false); }} className="text-[var(--brand-text)] hover:opacity-80 font-medium">{t('settings.yes')}</button>
                      <button type="button" onClick={() => setConfirmClearNotifications(false)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">{t('settings.no')}</button>
                    </div>
                  )}
                </div>
                <div className="p-2 overflow-auto min-h-0">
                  <NotificationDropdown
                    notifications={notifications}
                    loading={notificationsLoading}
                    onItemClick={(id, type, isRead) => { if (!isRead) markOneRead(id); goToNotificationTarget(type); }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={userDropdownRef}>
          <button type="button" onClick={() => setUserDropdownOpen((o) => !o)} className="flex items-center gap-2 p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]" aria-label={t('settings.settingsPage')}>
            <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--brand)] flex items-center justify-center shrink-0">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-4 h-4 text-[var(--text-inverse)]" />}
            </div>
          </button>
          <AnimatePresence>
            {userDropdownOpen && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute left-0 top-full mt-2 w-[200px] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-md)] z-[100] overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                  <p className="font-medium text-[var(--text-secondary)] truncate">{user?.fullName || '—'}</p>
                  <p className="text-sm text-[var(--text-muted)] truncate">{user?.username ? `@${user.username}` : '—'}</p>
                </div>
                <a href="#" onClick={(e) => { e.preventDefault(); goToSettings(); }} className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]">
                  <SettingsIcon className="w-4 h-4" />
                  {t('settings.settingsPage')}
                </a>
                <button type="button" onClick={() => { onLogout(); setUserDropdownOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] border-t border-[var(--border-subtle)]">
                  <LogOut className="w-4 h-4" />
                  {t('settings.logout')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
