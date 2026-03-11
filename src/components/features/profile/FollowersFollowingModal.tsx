import React from 'react';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '../../../store/profileStore';
import { useAuthStore } from '../../../store/authStore';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { useProfileFollowersFollowing } from '../../../hooks/useProfileFollowersFollowing';
import { FollowModalListRow, FollowModalSkeletonRow } from './FollowModalListRow';

export function FollowersFollowingModal() {
  const { t } = useTranslation('common');
  const authUser = useAuthStore((s) => s.user);
  const profileUsername = useProfileStore((s) => s.profileUsername);
  const isFollowersModalOpen = useProfileStore((s) => s.isFollowersModalOpen);
  const isFollowingModalOpen = useProfileStore((s) => s.isFollowingModalOpen);
  const followersList = useProfileStore((s) => s.followersList);
  const followingList = useProfileStore((s) => s.followingList);
  const followersLoading = useProfileStore((s) => s.followersLoading);
  const followingLoading = useProfileStore((s) => s.followingLoading);
  const hasMoreFollowers = useProfileStore((s) => s.hasMoreFollowers);
  const hasMoreFollowing = useProfileStore((s) => s.hasMoreFollowing);
  const followersPage = useProfileStore((s) => s.followersPage);
  const followingPage = useProfileStore((s) => s.followingPage);
  const closeFollowersModal = useProfileStore((s) => s.closeFollowersModal);
  const closeFollowingModal = useProfileStore((s) => s.closeFollowingModal);

  const { fetchFollowers, fetchFollowing, handleFollow, handleUnfollow, updating } =
    useProfileFollowersFollowing();

  const isOwn = Boolean(profileUsername && authUser?.username && profileUsername === authUser.username);

  return (
    <>
      <Modal
        isOpen={isFollowersModalOpen}
        onClose={closeFollowersModal}
        title={t('social.followersModalTitle')}
        size="lg"
      >
        <div className="max-h-[60vh] overflow-auto">
          {followersLoading && followersList.length === 0 ? (
            <>
              <FollowModalSkeletonRow />
              <FollowModalSkeletonRow />
              <FollowModalSkeletonRow />
            </>
          ) : followersList.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-6 text-center">{t('social.followersEmpty')}</p>
          ) : (
            <div className="divide-y-0">
              {followersList.map((item) => (
                <React.Fragment key={item.id}>
                  <FollowModalListRow
                    item={item}
                    isOwnProfile={isOwn}
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
                    updating={updating}
                  />
                </React.Fragment>
              ))}
            </div>
          )}
          {hasMoreFollowers && !followersLoading && (
            <div className="pt-4 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={followersLoading}
                loading={followersLoading}
                onClick={() => fetchFollowers(followersPage + 1, true)}
              >
                {t('social.loadMore')}
              </Button>
            </div>
          )}
        </div>
      </Modal>
      <Modal
        isOpen={isFollowingModalOpen}
        onClose={closeFollowingModal}
        title={t('social.followingModalTitle')}
        size="lg"
      >
        <div className="max-h-[60vh] overflow-auto">
          {followingLoading && followingList.length === 0 ? (
            <>
              <FollowModalSkeletonRow />
              <FollowModalSkeletonRow />
              <FollowModalSkeletonRow />
            </>
          ) : followingList.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-6 text-center">{t('social.followingEmpty')}</p>
          ) : (
            <div className="divide-y-0">
              {followingList.map((item) => (
                <React.Fragment key={item.id}>
                  <FollowModalListRow
                    item={item}
                    isOwnProfile={isOwn}
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
                    updating={updating}
                  />
                </React.Fragment>
              ))}
            </div>
          )}
          {hasMoreFollowing && !followingLoading && (
            <div className="pt-4 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={followingLoading}
                loading={followingLoading}
                onClick={() => fetchFollowing(followingPage + 1, true)}
              >
                {t('social.loadMore')}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
