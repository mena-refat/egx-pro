import { useEffect, useCallback, useState } from 'react';
import { useProfileStore, type FollowListItem } from '../store/profileStore';
import { useAuthStore } from '../store/authStore';
import { PAGINATION } from '../lib/constants';

export function useProfileFollowersFollowing() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const profileUsername = useProfileStore((s) => s.profileUsername);
  const isFollowersModalOpen = useProfileStore((s) => s.isFollowersModalOpen);
  const isFollowingModalOpen = useProfileStore((s) => s.isFollowingModalOpen);
  const followersList = useProfileStore((s) => s.followersList);
  const followersPage = useProfileStore((s) => s.followersPage);
  const followingPage = useProfileStore((s) => s.followingPage);
  const setFollowersList = useProfileStore((s) => s.setFollowersList);
  const setFollowingList = useProfileStore((s) => s.setFollowingList);
  const appendFollowersList = useProfileStore((s) => s.appendFollowersList);
  const appendFollowingList = useProfileStore((s) => s.appendFollowingList);
  const setFollowersLoading = useProfileStore((s) => s.setFollowersLoading);
  const setFollowingLoading = useProfileStore((s) => s.setFollowingLoading);
  const setFollowStatusInFollowers = useProfileStore((s) => s.setFollowStatusInFollowers);
  const setFollowStatusInFollowing = useProfileStore((s) => s.setFollowStatusInFollowing);
  const incrementFollowingCount = useProfileStore((s) => s.incrementFollowingCount);
  const decrementFollowingCount = useProfileStore((s) => s.decrementFollowingCount);

  const [updating, setUpdating] = useState<string | null>(null);

  const mapItem = (x: { id: string; username: string | null; joinDate: string; isPrivate: boolean; followStatus: string }): FollowListItem => ({
    id: x.id,
    username: x.username,
    joinDate: x.joinDate,
    isPrivate: x.isPrivate,
    followStatus: (x.followStatus === 'pending' || x.followStatus === 'following' ? x.followStatus : 'none') as FollowListItem['followStatus'],
  });

  const fetchFollowers = useCallback(
    async (page: number, append: boolean, signal?: AbortSignal) => {
      if (!profileUsername || !accessToken) return;
      setFollowersLoading(true);
      try {
        const res = await fetch(
          `/api/social/profile/${encodeURIComponent(profileUsername)}/followers?page=${page}&limit=${PAGINATION.defaultLimit}`,
          { headers: { Authorization: `Bearer ${accessToken}` }, signal }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!append) setFollowersList([], false, 1);
          return;
        }
        const payload = data?.data ?? {};
        const items: FollowListItem[] = (payload.items ?? []).map(mapItem);
        if (append) appendFollowersList(items, payload.hasMore ?? false);
        else setFollowersList(items, payload.hasMore ?? false, page);
      } catch (e: unknown) {
        if ((e as { name?: string }).name === 'AbortError') return;
        if (!append) setFollowersList([], false, 1);
      } finally {
        setFollowersLoading(false);
      }
    },
    [profileUsername, accessToken, setFollowersList, appendFollowersList, setFollowersLoading]
  );

  const fetchFollowing = useCallback(
    async (page: number, append: boolean, signal?: AbortSignal) => {
      if (!profileUsername || !accessToken) return;
      setFollowingLoading(true);
      try {
        const res = await fetch(
          `/api/social/profile/${encodeURIComponent(profileUsername)}/following?page=${page}&limit=${PAGINATION.defaultLimit}`,
          { headers: { Authorization: `Bearer ${accessToken}` }, signal }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!append) setFollowingList([], false, 1);
          return;
        }
        const payload = data?.data ?? {};
        const items: FollowListItem[] = (payload.items ?? []).map(mapItem);
        if (append) appendFollowingList(items, payload.hasMore ?? false);
        else setFollowingList(items, payload.hasMore ?? false, page);
      } catch (e: unknown) {
        if ((e as { name?: string }).name === 'AbortError') return;
        if (!append) setFollowingList([], false, 1);
      } finally {
        setFollowingLoading(false);
      }
    },
    [profileUsername, accessToken, setFollowingList, appendFollowingList, setFollowingLoading]
  );

  useEffect(() => {
    if (!isFollowersModalOpen || !profileUsername) return;
    const controller = new AbortController();
    fetchFollowers(1, false, controller.signal);
    return () => controller.abort();
  }, [isFollowersModalOpen, profileUsername, fetchFollowers]);

  useEffect(() => {
    if (!isFollowingModalOpen || !profileUsername) return;
    const controller = new AbortController();
    fetchFollowing(1, false, controller.signal);
    return () => controller.abort();
  }, [isFollowingModalOpen, profileUsername, fetchFollowing]);

  const handleFollow = useCallback(
    async (username: string) => {
      if (!accessToken) return;
      setUpdating(username);
      setFollowStatusInFollowers(username, 'pending');
      setFollowStatusInFollowing(username, 'pending');
      try {
        const res = await fetch(`/api/social/follow/${encodeURIComponent(username)}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const body = await res.json().catch(() => ({}));
        const status = body?.data?.status;
        const next: FollowListItem['followStatus'] = status === 'ACCEPTED' ? 'following' : 'pending';
        setFollowStatusInFollowers(username, next);
        setFollowStatusInFollowing(username, next);
        if (status === 'ACCEPTED') incrementFollowingCount();
      } catch {
        setFollowStatusInFollowers(username, 'none');
        setFollowStatusInFollowing(username, 'none');
      } finally {
        setUpdating(null);
      }
    },
    [
      accessToken,
      setFollowStatusInFollowers,
      setFollowStatusInFollowing,
      incrementFollowingCount,
    ]
  );

  const handleUnfollow = useCallback(
    async (username: string) => {
      if (!accessToken) return;
      const prevFollowers = followersList.find((u) => u.username === username)?.followStatus ?? 'following';
      const prevFollowing = useProfileStore.getState().followingList.find((u) => u.username === username)?.followStatus ?? 'following';
      setUpdating(username);
      setFollowStatusInFollowers(username, 'none');
      setFollowStatusInFollowing(username, 'none');
      decrementFollowingCount();
      try {
        await fetch(`/api/social/unfollow/${encodeURIComponent(username)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch {
        setFollowStatusInFollowers(username, prevFollowers);
        setFollowStatusInFollowing(username, prevFollowing);
        incrementFollowingCount();
      } finally {
        setUpdating(null);
      }
    },
    [
      accessToken,
      followersList,
      setFollowStatusInFollowers,
      setFollowStatusInFollowing,
      decrementFollowingCount,
      incrementFollowingCount,
    ]
  );

  return { fetchFollowers, fetchFollowing, handleFollow, handleUnfollow, updating };
}
