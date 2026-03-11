import React from 'react';
import { useTranslation } from 'react-i18next';
import { User as UserIcon, Lock, Loader2 } from 'lucide-react';
import type { SocialProfile } from './types';

type Props = {
  data: SocialProfile;
  username: string;
  isOwnProfile: boolean;
  accessToken: string | null;
  followLoading: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
};

export function SocialProfileHeader({
  data,
  username,
  isOwnProfile,
  accessToken,
  followLoading,
  onFollow,
  onUnfollow,
}: Props) {
  const { t } = useTranslation('common');
  const joined = data.joinDate ? new Date(data.joinDate).toLocaleDateString() : null;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] flex items-center justify-center shrink-0">
          <UserIcon className="w-6 h-6 text-[var(--text-muted)]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">@{data.username ?? username}</span>
            {data.isPrivate && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-[var(--bg-card)] text-[var(--text-secondary)] text-[11px]">
                <Lock className="w-3 h-3" />
                {t('social.private', { defaultValue: 'Private' })}
              </span>
            )}
          </div>
          {joined && (
            <p className="text-xs text-[var(--text-secondary)]">
              {t('social.joined', { defaultValue: 'Joined' })} {joined}
            </p>
          )}
        </div>
      </div>
      {!isOwnProfile && accessToken && (
        <div className="shrink-0">
          {data.myFollowStatus === 'none' && (
            <button
              type="button"
              disabled={followLoading}
              onClick={onFollow}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand)] text-[var(--text-inverse)] text-sm font-medium disabled:opacity-60"
            >
              {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('social.follow', { defaultValue: 'Follow' })}
            </button>
          )}
          {data.myFollowStatus === 'pending' && (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm">
              {t('social.requestPending', { defaultValue: 'Request Pending' })}
              <button type="button" disabled={followLoading} onClick={onUnfollow} className="text-[var(--text-muted)] hover:text-[var(--danger)] text-xs">
                {t('social.cancelRequest', { defaultValue: 'Cancel' })}
              </button>
            </span>
          )}
          {data.myFollowStatus === 'following' && (
            <button
              type="button"
              disabled={followLoading}
              onClick={onUnfollow}
              className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-secondary)] disabled:opacity-60"
            >
              {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('social.unfollow', { defaultValue: 'Unfollow' })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
