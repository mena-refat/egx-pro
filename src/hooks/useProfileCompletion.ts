import { useState, useEffect, useCallback } from 'react';

const WEIGHTS = {
  hasFullName: 20,
  hasUsername: 20,
  hasPhone: 20,
  hasGoal: 20,
  hasWatchlist: 20,
} as const;

export function useProfileCompletion(accessToken: string | null, user: { fullName?: string | null; username?: string | null; phone?: string | null } | null) {
  const [goalsCount, setGoalsCount] = useState(0);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    if (!accessToken) {
      setGoalsCount(0);
      setWatchlistCount(0);
      setLoading(false);
      return;
    }
    try {
      const [goalsRes, watchlistRes] = await Promise.all([
        fetch('/api/goals', { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch('/api/watchlist', { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      const goals = goalsRes.ok ? await goalsRes.json() : [];
      const watchlist = watchlistRes.ok ? await watchlistRes.json() : [];
      setGoalsCount(Array.isArray(goals) ? goals.length : 0);
      setWatchlistCount(Array.isArray(watchlist) ? watchlist.length : 0);
    } catch {
      setGoalsCount(0);
      setWatchlistCount(0);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const hasFullName = Boolean(user?.fullName?.trim());
  const hasUsername = Boolean(user?.username?.trim());
  const hasPhone = Boolean(user?.phone?.trim());
  const hasGoal = goalsCount >= 1;
  const hasWatchlist = watchlistCount >= 1;

  const percentage =
    (hasFullName ? WEIGHTS.hasFullName : 0) +
    (hasUsername ? WEIGHTS.hasUsername : 0) +
    (hasPhone ? WEIGHTS.hasPhone : 0) +
    (hasGoal ? WEIGHTS.hasGoal : 0) +
    (hasWatchlist ? WEIGHTS.hasWatchlist : 0);

  const isComplete = percentage >= 100;

  return { percentage, isComplete, loading, refetch: fetchCounts };
}
