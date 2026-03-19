import React from 'react';
import { useTranslation } from 'react-i18next';
import { User as UserIcon } from 'lucide-react';
import { ProfileCounterRow } from './ProfileCounterRow';
import { FollowersFollowingModal } from './FollowersFollowingModal';
import { SocialProfileHeader } from './SocialProfileHeader';
import { SocialProfilePortfolioDonut } from './SocialProfilePortfolioDonut';
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

export function SocialProfilePublicContent({
  data,
  username,
  isOwnProfile,
  accessToken,
  followLoading,
  onFollow,
  onUnfollow,
}: Props) {
  const { t } = useTranslation('common');

  return (
    <div className="p-6 space-y-6 bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen">
      <SocialProfileHeader
        data={data}
        username={username}
        isOwnProfile={isOwnProfile}
        accessToken={accessToken}
        followLoading={followLoading}
        onFollow={onFollow}
        onUnfollow={onUnfollow}
      />
      <ProfileCounterRow
        profileUsername={data.username ?? username ?? ''}
        followersCount={data.followersCount ?? 0}
        followingCount={data.followingCount ?? 0}
        canOpenModals={true}
      />
      {data.portfolio && data.portfolio.length > 0 && data.showPortfolio !== false && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <h3 className="text-sm font-bold mb-3">{t('social.portfolioAllocation', { defaultValue: 'Portfolio allocation (%)' })}</h3>
          <SocialProfilePortfolioDonut items={data.portfolio} />
        </div>
      )}
      {data.watchlist && data.watchlist.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <h3 className="text-sm font-bold mb-3">{t('social.watchlist', { defaultValue: 'Watchlist' })}</h3>
          <div className="flex flex-wrap gap-2">
            {data.watchlist.map((w) => (
              <span key={w.ticker} className="px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-xs font-medium">
                {w.ticker}
              </span>
            ))}
          </div>
        </div>
      )}
      <FollowersFollowingModal />
    </div>
  );
}
