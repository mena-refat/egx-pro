import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { useProfileStore } from '../../../store/profileStore';
import { useAuthStore } from '../../../store/authStore';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import EmptyState from '../../shared/EmptyState';
import { useProfileFollowersFollowing } from '../../../hooks/useProfileFollowersFollowing';
import { FollowModalListRow, FollowModalSkeletonRow } from './FollowModalListRow';

const ROW_ESTIMATE = 72;
const OVERSCAN = 5;

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

  const followersRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef<HTMLDivElement>(null);

  const followersVirtualizer = useVirtualizer({
    count: followersList.length,
    getScrollElement: () => followersRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: OVERSCAN,
  });

  const followingVirtualizer = useVirtualizer({
    count: followingList.length,
    getScrollElement: () => followingRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: OVERSCAN,
  });

  return (
    <>
      <Modal
        isOpen={isFollowersModalOpen}
        onClose={closeFollowersModal}
        title={t('social.followersModalTitle')}
        size="lg"
      >
        <div ref={followersRef} className="max-h-[60vh] overflow-auto">
          {followersLoading && followersList.length === 0 ? (
            <>
              <FollowModalSkeletonRow />
              <FollowModalSkeletonRow />
              <FollowModalSkeletonRow />
            </>
          ) : followersList.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('social.followersEmpty')}
              description={t('social.followersEmptyDesc', { defaultValue: 'لا يوجد متابعون بعد.' })}
            />
          ) : (
            <div
              className="relative w-full"
              style={{ height: `${followersVirtualizer.getTotalSize()}px` }}
            >
              {followersVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = followersList[virtualRow.index];
                return (
                  <div
                    key={item.id}
                    className="absolute left-0 w-full"
                    style={{
                      top: virtualRow.start,
                      height: `${virtualRow.size}px`,
                    }}
                  >
                    <FollowModalListRow
                      item={item}
                      isOwnProfile={isOwn}
                      onFollow={handleFollow}
                      onUnfollow={handleUnfollow}
                      updating={updating}
                    />
                  </div>
                );
              })}
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
        <div ref={followingRef} className="max-h-[60vh] overflow-auto">
          {followingLoading && followingList.length === 0 ? (
            <>
              <FollowModalSkeletonRow />
              <FollowModalSkeletonRow />
              <FollowModalSkeletonRow />
            </>
          ) : followingList.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('social.followingEmpty')}
              description={t('social.followingEmptyDesc', { defaultValue: 'لا يتابع أحداً بعد.' })}
            />
          ) : (
            <div
              className="relative w-full"
              style={{ height: `${followingVirtualizer.getTotalSize()}px` }}
            >
              {followingVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = followingList[virtualRow.index];
                return (
                  <div
                    key={item.id}
                    className="absolute left-0 w-full"
                    style={{
                      top: virtualRow.start,
                      height: `${virtualRow.size}px`,
                    }}
                  >
                    <FollowModalListRow
                      item={item}
                      isOwnProfile={isOwn}
                      onFollow={handleFollow}
                      onUnfollow={handleUnfollow}
                      updating={updating}
                    />
                  </div>
                );
              })}
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
