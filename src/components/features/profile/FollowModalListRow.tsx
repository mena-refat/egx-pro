import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/Button';
import type { FollowListItem } from '../../../store/profileStore';

export function getInitials(username: string | null): string {
  if (!username || !username.trim()) return '?';
  const parts = username.replace(/@/g, '').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  return username.slice(0, 2).toUpperCase();
}

export interface FollowModalListRowProps {
  item: FollowListItem;
  isOwnProfile: boolean;
  onFollow: (username: string) => void;
  onUnfollow: (username: string) => void;
  updating: string | null;
}

export function FollowModalListRow({
  item,
  isOwnProfile,
  onFollow,
  onUnfollow,
  updating,
}: FollowModalListRowProps) {
  const { t } = useTranslation('common');
  const u = item.username ?? '';
  const loading = updating === u;

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-[var(--border-subtle)] last:border-b-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center shrink-0 text-sm font-medium text-[var(--text-primary)]">
          {getInitials(u)}
        </div>
        <span className="text-sm font-medium text-[var(--text-primary)] truncate">@{u}</span>
      </div>
      {!isOwnProfile && (
        <div className="shrink-0">
          {item.followStatus === 'none' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={loading}
              loading={loading}
              onClick={() => onFollow(u)}
            >
              {t('social.follow')}
            </Button>
          )}
          {item.followStatus === 'pending' && (
            <span className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)]">
              {t('social.requestPending')}
            </span>
          )}
          {item.followStatus === 'following' && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              loading={loading}
              onClick={() => onUnfollow(u)}
            >
              {t('social.unfollow')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function FollowModalSkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--border-subtle)]">
      <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] animate-pulse shrink-0" />
      <div className="h-4 flex-1 max-w-[120px] rounded bg-[var(--bg-secondary)] animate-pulse" />
    </div>
  );
}
