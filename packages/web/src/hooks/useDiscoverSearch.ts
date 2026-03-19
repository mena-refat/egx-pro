import { useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDiscoverSearchQuery } from './useDiscoverSearchQuery';

export function useDiscoverSearch() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { query, setQuery, results, setResults, loading } = useDiscoverSearchQuery();
  const [updating, setUpdating] = useState<string | null>(null);

  const handleFollow = useCallback(
    async (username: string) => {
      if (!accessToken) return;
      setUpdating(username);
      setResults((prev) =>
        prev.map((u) =>
          u.username === username ? { ...u, myFollowStatus: 'pending' as const } : u
        )
      );
      try {
        const res = await fetch(`/api/social/follow/${encodeURIComponent(username)}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          const status = body?.data?.status;
          setResults((prev) =>
            prev.map((u) =>
              u.username === username
                ? { ...u, myFollowStatus: status === 'ACCEPTED' ? 'following' : 'pending' }
                : u
            )
          );
        } else {
          setResults((prev) =>
            prev.map((u) =>
              u.username === username ? { ...u, myFollowStatus: 'none' as const } : u
            )
          );
          const { toast } = await import('../store/toastStore');
          const i18n = (await import('../lib/i18n')).default;
          toast.error(i18n.t('errors.internal'));
        }
      } catch {
        setResults((prev) =>
          prev.map((u) =>
            u.username === username ? { ...u, myFollowStatus: 'none' as const } : u
          )
        );
        const { toast } = await import('../store/toastStore');
        const i18n = (await import('../lib/i18n')).default;
        toast.error(i18n.t('errors.internal'));
      } finally {
        setUpdating(null);
      }
    },
    [accessToken, setResults]
  );

  const handleUnfollow = useCallback(
    async (username: string) => {
      if (!accessToken) return;
      const prevStatus = results.find((u) => u.username === username)?.myFollowStatus ?? 'following';
      setUpdating(username);
      setResults((prev) =>
        prev.map((u) =>
          u.username === username ? { ...u, myFollowStatus: 'none' as const } : u
        )
      );
      try {
        const res = await fetch(`/api/social/unfollow/${encodeURIComponent(username)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
          setResults((prev) =>
            prev.map((u) =>
              u.username === username ? { ...u, myFollowStatus: prevStatus } : u
            )
          );
          const { toast } = await import('../store/toastStore');
          const i18n = (await import('../lib/i18n')).default;
          toast.error(i18n.t('errors.internal'));
        }
      } catch {
        setResults((prev) =>
          prev.map((u) =>
            u.username === username ? { ...u, myFollowStatus: prevStatus } : u
          )
        );
        const { toast } = await import('../store/toastStore');
        const i18n = (await import('../lib/i18n')).default;
        toast.error(i18n.t('errors.internal'));
      } finally {
        setUpdating(null);
      }
    },
    [accessToken, results, setResults]
  );

  return {
    query,
    setQuery,
    results,
    loading,
    updating,
    accessToken,
    handleFollow,
    handleUnfollow,
  };
}
