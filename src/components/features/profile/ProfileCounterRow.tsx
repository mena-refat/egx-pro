import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '../../../store/profileStore';
import { Button } from '../../ui/Button';

export interface ProfileCounterRowProps {
  profileUsername: string;
  followersCount: number;
  followingCount: number;
  canOpenModals: boolean;
}

export function ProfileCounterRow({
  profileUsername,
  followersCount,
  followingCount,
  canOpenModals,
}: ProfileCounterRowProps) {
  const { t } = useTranslation('common');
  const openFollowersModal = useProfileStore((s) => s.openFollowersModal);
  const openFollowingModal = useProfileStore((s) => s.openFollowingModal);
  const setCounts = useProfileStore((s) => s.setCounts);

  useEffect(() => {
    setCounts(followersCount, followingCount);
  }, [followersCount, followingCount, setCounts]);

  const openFollowers = () => {
    if (!canOpenModals) return;
    openFollowersModal(profileUsername);
  };
  const openFollowing = () => {
    if (!canOpenModals) return;
    openFollowingModal(profileUsername);
  };

  const counterClass = canOpenModals
    ? 'cursor-pointer text-[var(--text-secondary)] hover:text-[var(--brand-text)]'
    : 'text-[var(--text-secondary)] cursor-default';

  const tooltip = !canOpenModals ? t('social.privateAccountTooltip') : undefined;
  return (
    <div className="flex gap-6 text-sm">
      <span title={tooltip} className="inline-flex">
        <Button
          type="button"
          variant="link"
          onClick={openFollowers}
          disabled={!canOpenModals}
          className={`flex items-center gap-1.5 font-normal ${counterClass}`}
        >
          <span className="font-semibold text-[var(--text-primary)]">{followersCount}</span>
          <span>{t('social.followerLabel')}</span>
        </Button>
      </span>
      <span title={tooltip} className="inline-flex">
        <Button
          type="button"
          variant="link"
          onClick={openFollowing}
          disabled={!canOpenModals}
          className={`flex items-center gap-1.5 font-normal ${counterClass}`}
        >
          <span className="font-semibold text-[var(--text-primary)]">{followingCount}</span>
          <span>{t('social.followingLabel')}</span>
        </Button>
      </span>
    </div>
  );
}
