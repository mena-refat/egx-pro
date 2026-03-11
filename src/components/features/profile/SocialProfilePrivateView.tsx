import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { ProfileCounterRow } from './ProfileCounterRow';
import { FollowersFollowingModal } from './FollowersFollowingModal';
import type { SocialProfile } from './types';

type Props = {
  data: SocialProfile;
  username: string;
  followLoading: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
};

export function SocialProfilePrivateView({ data, username, followLoading, onFollow, onUnfollow }: Props) {
  const { t } = useTranslation('common');
  const joined = data.joinDate ? new Date(data.joinDate).toLocaleDateString() : null;

  return (
    <div className="p-6 space-y-6 bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] flex items-center justify-center">
          <UserIcon className="w-6 h-6 text-[var(--text-muted)]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">@{data.username ?? username}</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-[var(--bg-card)] text-[var(--text-secondary)] text-[11px]">
              <Lock className="w-3 h-3" />
              {t('social.private', { defaultValue: 'Private' })}
            </span>
          </div>
          {joined && (
            <p className="text-xs text-[var(--text-secondary)]">
              {t('social.joined', { defaultValue: 'Joined' })} {joined}
            </p>
          )}
        </div>
      </div>
      <ProfileCounterRow
        profileUsername={data.username ?? username ?? ''}
        followersCount={data.followersCount ?? 0}
        followingCount={data.followingCount ?? 0}
        canOpenModals={false}
      />
      <div className="flex flex-col items-center justify-center text-center text-[var(--text-secondary)] py-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <Lock className="w-10 h-10 mb-3 text-[var(--text-muted)]" />
        <p className="font-bold mb-1">{t('social.privateAccountTitle', { defaultValue: 'This account is private' })}</p>
        <p className="text-sm mb-4">
          {t('social.privateAccountBody', { defaultValue: 'Only approved followers can see this portfolio and watchlist.' })}
        </p>
        {data.myFollowStatus === 'none' && (
          <button
            type="button"
            disabled={followLoading}
            onClick={onFollow}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand)] text-[var(--text-inverse)] font-medium disabled:opacity-60"
          >
            {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('social.requestToFollow', { defaultValue: 'Request to Follow' })}
          </button>
        )}
        {data.myFollowStatus === 'pending' && (
          <div className="flex items-center gap-2">
            <span className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
              {t('social.requestPending', { defaultValue: 'Request Pending' })}
            </span>
            <button type="button" disabled={followLoading} onClick={onUnfollow} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-60">
              {t('social.cancelRequest', { defaultValue: 'Cancel' })}
            </button>
          </div>
        )}
      </div>
      <FollowersFollowingModal />
    </div>
  );
}
