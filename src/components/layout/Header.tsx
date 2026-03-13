import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Settings as SettingsIcon, Sun, Moon, Monitor, Target, Bell, LogOut, Trophy, Briefcase, UserPlus as UserPlusIcon, ChevronRight } from 'lucide-react';
import type { NotificationItem } from '../../hooks/useNotifications';
import { NotificationDropdown } from '../features/notifications/NotificationDropdown';
import { Button } from '../ui/Button';

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
}: HeaderProps) {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
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

  const goToSettings = () => { navigate('/settings'); setUserDropdownOpen(false); };

  const goToNotificationTarget = (type: string, route?: string | null) => {
    setNotificationsOpen(false);
    if (route) {
      navigate(route);
      return;
    }
    if (type === 'achievement') navigate('/settings?tab=achievements');
    else if (type === 'stock_target') navigate('/stocks');
    else if (type === 'referral') navigate('/settings?tab=referral');
    else if (type === 'goal') navigate('/goals');
    else if (type === 'portfolio') navigate('/portfolio');
    else if (type === 'social_follow' || type === 'social_request' || type === 'social_accept') navigate('/profile');
  };


  return (
    <header className="flex justify-between items-center mb-4 sm:mb-6 flex-wrap gap-2 sm:gap-3" dir={i18n.language.startsWith('ar') ? 'rtl' : 'ltr'}>
      <div className="text-end min-w-0 flex-1">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--text-primary)] truncate">
          {t('header.welcomeUser', { name: user?.fullName || t('header.defaultUser') })}
        </h2>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {profileCompletion != null && profileCompletion.percentage < 100 && (
          <div className="relative" ref={completionDropdownRef}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setProfileCompletionOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg bg-[var(--brand-subtle)] hover:opacity-90 border-[var(--border)]"
            >
              <div className="w-12 h-1.5 bg-[var(--border)] rounded-full overflow-hidden shrink-0">
                <div className="h-full w-progress bg-[var(--brand)] rounded-full" style={{ ['--progress-width']: `${profileCompletion.percentage}%` } as React.CSSProperties} />
              </div>
              <span className="text-xs font-bold text-[var(--brand-text)] whitespace-nowrap">{profileCompletion.percentage}%</span>
              <span className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap hidden sm:inline">{t('overview.completeProfile')}</span>
              <ChevronRight className={`w-4 h-4 text-[var(--brand-text)] shrink-0 ${profileCompletionOpen ? 'rotate-90' : ''} ${i18n.language.startsWith('ar') ? 'rotate-180' : ''}`} />
            </Button>
            <AnimatePresence>
              {profileCompletionOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-md)] z-50 overflow-hidden ltr:right-auto ltr:left-0"
                >
                  <div className="p-3 border-b border-[var(--border-subtle)]">
                    <p className="text-sm font-medium text-[var(--text-secondary)]">{t('overview.profileCompletePercent', { p: profileCompletion.percentage })}</p>
                    <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden mt-2">
                      <div className="h-full w-progress bg-[var(--brand)] rounded-full transition-[width]" style={{ ['--progress-width']: `${profileCompletion.percentage}%` } as React.CSSProperties} />
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
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={() => {
                                setProfileCompletionOpen(false);
                                navigate(m.route);
                              }}
                              className="text-xs font-medium flex items-center gap-0.5"
                            >
                              {t('overview.add')}
                              <ChevronRight className={`w-3 h-3 ${i18n.language.startsWith('ar') ? 'rotate-180' : ''}`} />
                            </Button>
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
          <Button type="button" variant="ghost" size="sm" onClick={() => onThemeChange('light')} className={`w-8 h-8 min-w-0 p-0 rounded-full ${theme === 'light' ? 'bg-[var(--brand)] text-[var(--text-inverse)]' : ''}`} icon={<Sun className="w-4 h-4" />} aria-label="Light mode"> </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onThemeChange('system')} className={`w-8 h-8 min-w-0 p-0 rounded-full ${theme === 'system' ? 'bg-[var(--text-inverse)] text-[var(--text-primary)]' : ''}`} icon={<Monitor className="w-4 h-4" />} aria-label="System theme"> </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onThemeChange('dark')} className={`w-8 h-8 min-w-0 p-0 rounded-full ${theme === 'dark' ? 'bg-[var(--brand)] text-[var(--text-inverse)]' : ''}`} icon={<Moon className="w-4 h-4" />} aria-label="Dark mode"> </Button>
        </div>

        <div className="relative" ref={notificationsRef}>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setNotificationsOpen((o) => !o); if (!notificationsOpen) fetchNotifications(); }} className="relative p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]" icon={<Bell className="w-5 h-5" />} aria-label={t('settings.notifications')}>
            {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--danger)]" aria-hidden />}
          </Button>
          <AnimatePresence>
            {notificationsOpen && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={`absolute left-0 top-full mt-2 w-80 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-md)] z-[100] flex flex-col ${notifications.length > 0 ? 'max-h-96 overflow-hidden' : ''} ltr:left-auto ltr:right-0`}>
                <div className="shrink-0 border-b border-[var(--border-subtle)] px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[var(--text-secondary)]">{t('settings.notifications')}</span>
                    <Button type="button" variant="link" size="sm" onClick={() => setConfirmClearNotifications(true)} className="text-xs">{t('settings.clearAllNotifications')}</Button>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button type="button" variant="link" size="sm" onClick={markAllRead} className="text-[var(--text-muted)]">{t('settings.markAllAsRead')}</Button>
                  </div>
                  {confirmClearNotifications && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--bg-secondary)] px-3 py-2 text-xs">
                      <span className="text-[var(--text-secondary)]">{t('settings.confirmClearNotifications')}</span>
                      <Button type="button" variant="link" size="sm" onClick={() => { clearAll(); setConfirmClearNotifications(false); }}>{t('settings.yes')}</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmClearNotifications(false)} className="text-[var(--text-muted)]">{t('settings.no')}</Button>
                    </div>
                  )}
                </div>
                <div className={`p-2 min-h-0 ${notifications.length > 0 ? 'overflow-y-auto flex-1' : 'overflow-hidden'}`}>
                  <NotificationDropdown
                    notifications={notifications}
                    loading={notificationsLoading}
                    onItemClick={(id, type, isRead, route) => { if (!isRead) markOneRead(id); goToNotificationTarget(type, route); }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={userDropdownRef}>
          <Button type="button" variant="ghost" size="sm" onClick={() => setUserDropdownOpen((o) => !o)} className="flex items-center gap-2 p-1.5 rounded-lg min-w-0" aria-label={t('settings.settingsPage')}>
            <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--brand)] flex items-center justify-center shrink-0">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt={t('profile.avatarAlt', { name: user.fullName ?? '' })} className="w-full h-full object-cover" /> : <UserIcon className="w-4 h-4 text-[var(--text-inverse)]" aria-hidden="true" />}
            </div>
          </Button>
          <AnimatePresence>
            {userDropdownOpen && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute left-0 ltr:right-0 ltr:-left-40 top-full mt-2 w-[200px] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-md)] z-[100] overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                  <p className="font-medium text-[var(--text-secondary)] truncate">{user?.fullName || '—'}</p>
                  <p className="text-sm text-[var(--text-muted)] truncate">{user?.username ? `@${user.username}` : '—'}</p>
                </div>
                <a href="#" onClick={(e) => { e.preventDefault(); goToSettings(); }} className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]">
                  <SettingsIcon className="w-4 h-4" />
                  {t('settings.settingsPage')}
                </a>
                <Button type="button" variant="ghost" size="md" fullWidth onClick={() => { onLogout(); setUserDropdownOpen(false); }} className="justify-start rounded-none border-t border-[var(--border-subtle)]">
                  <LogOut className="w-4 h-4 shrink-0" />
                  {t('settings.logout')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
  