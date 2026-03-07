import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Trophy, TrendingUp, UserPlus as UserPlusIcon, Target, Briefcase, Circle } from 'lucide-react';
import { Skeleton } from '../../ui/Skeleton';
import type { NotificationItem } from '../../../hooks/useNotifications';

type NotificationDropdownProps = {
  notifications: NotificationItem[];
  loading: boolean;
  onItemClick: (id: string, type: string, isRead: boolean) => void;
};

export function NotificationDropdown({ notifications, loading, onItemClick }: NotificationDropdownProps) {
  const { t } = useTranslation('common');

  if (loading) {
    return (
      <div className="space-y-2 p-2">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)]">
        <Bell className="w-10 h-10 mb-2 opacity-60" />
        <p className="text-sm">{t('settings.noNewNotifications')}</p>
      </div>
    );
  }

  return (
    <>
      {notifications.map((n) => {
        const Icon = n.type === 'achievement' ? Trophy : n.type === 'stock_target' ? TrendingUp : n.type === 'referral' ? UserPlusIcon : n.type === 'goal' ? Target : Briefcase;
        const timeAgo = (() => {
          const d = new Date(n.createdAt);
          const diff = (Date.now() - d.getTime()) / 1000;
          if (diff < 60) return t('settings.lastActivityMoments');
          if (diff < 3600) return t('settings.lastActivityMinutes', { m: Math.floor(diff / 60) });
          if (diff < 86400) return t('settings.lastActivityHours', { h: Math.floor(diff / 3600) });
          return t('settings.lastActivityDays', { d: Math.floor(diff / 86400) });
        })();
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => onItemClick(n.id, n.type, n.isRead)}
            className={`w-full flex gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${!n.isRead ? 'bg-[var(--brand-subtle)] hover:opacity-90' : 'hover:bg-[var(--bg-card-hover)]'}`}
          >
            <span className="w-2 shrink-0 flex items-start justify-center pt-2">
              {!n.isRead && <Circle className="w-2 h-2 text-[var(--brand-text)] fill-[var(--brand-text)]" aria-hidden />}
            </span>
            <Icon className="w-4 h-4 text-[var(--brand-text)] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-secondary)]">{n.title}</p>
              {n.body && <p className="text-xs text-[var(--text-muted)] mt-0.5">{n.body}</p>}
              <p className="text-xs text-[var(--text-muted)] mt-1">{timeAgo}</p>
            </div>
          </button>
        );
      })}
    </>
  );
}
