import { useState, useCallback, useEffect } from 'react';
import type { SocialProfile } from '../components/features/profile/types';

export function useSocialProfile(username: string | undefined, accessToken: string | null, isOwnProfile: boolean) {
  const [data, setData] = useState<SocialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/social/profile/${encodeURIComponent(username)}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || 'NOT_FOUND');
        setData(null);
        return;
      }
      const payload = (body as { data?: SocialProfile }).data ?? (body as SocialProfile);
      setData(payload);
    } catch {
      setError('LOAD_ERROR');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [username, accessToken]);

  useEffect(() => {
    if (!username || isOwnProfile) return;
    fetchProfile();
  }, [username, accessToken, isOwnProfile, fetchProfile]);

  const handleFollow = useCallback(async () => {
    if (!username || !accessToken) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/social/follow/${encodeURIComponent(username)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        const status = body?.data?.status;
        setData((prev) =>
          prev ? { ...prev, myFollowStatus: status === 'ACCEPTED' ? 'following' : 'pending' } : null
        );
      }
    } finally {
      setFollowLoading(false);
    }
  }, [username, accessToken]);

  const handleUnfollow = useCallback(async () => {
    if (!username || !accessToken) return;
    setFollowLoading(true);
    try {
      await fetch(`/api/social/unfollow/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setData((prev) => (prev ? { ...prev, myFollowStatus: 'none' as const } : null));
    } finally {
      setFollowLoading(false);
    }
  }, [username, accessToken]);

  return { data, loading, error, followLoading, handleFollow, handleUnfollow };
}
