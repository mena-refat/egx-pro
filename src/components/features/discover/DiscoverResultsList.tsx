import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Users, Loader2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import type { SearchResult } from './types';

type Props = {
  results: SearchResult[];
  updating: string | null;
  onFollow: (username: string) => void;
  onUnfollow: (username: string) => void;
};

export function DiscoverResultsList({ results, updating, onFollow, onUnfollow }: Props) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <ul className="space-y-3">
      {results.map((u) => (
        <li
          key={u.id}
          className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
        >
          <button
            type="button"
            onClick={() => u.username && navigate(`/profile/${u.username}`)}
            className="flex items-center gap-3 min-w-0 flex-1 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden shrink-0">
              {u.avatarUrl ? (
                <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-5 h-5 text-[var(--text-muted)]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">@{u.username ?? u.id}</p>
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {u.followersCount} {t('social.followers', { defaultValue: 'Followers' })}
              </p>
            </div>
          </button>
          {u.myFollowStatus === 'none' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!!updating}
              onClick={() => u.username && onFollow(u.username)}
            >
              {updating === u.username ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              ) : (
                t('social.follow', { defaultValue: 'Follow' })
              )}
            </Button>
          )}
          {u.myFollowStatus === 'pending' && (
            <span className="shrink-0 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm">
              {t('social.pending', { defaultValue: 'Pending' })}
            </span>
          )}
          {u.myFollowStatus === 'following' && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!!updating}
              onClick={() => u.username && onUnfollow(u.username)}
            >
              {updating === u.username ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              ) : (
                t('social.unfollow', { defaultValue: 'Unfollow' })
              )}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
