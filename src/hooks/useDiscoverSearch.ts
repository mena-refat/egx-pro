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
        }
      } finally {
        setUpdating(null);
      }
    },
    [accessToken]
  );

  const handleUnfollow = useCallback(
    async (username: string) => {
      if (!accessToken) return;
      setUpdating(username);
      try {
        await fetch(`/api/social/unfollow/${encodeURIComponent(username)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setResults((prev) =>
          prev.map((u) =>
            u.username === username ? { ...u, myFollowStatus: 'none' as const } : u
          )
        );
      } finally {
        setUpdating(null);
      }
    },
    [accessToken]
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
