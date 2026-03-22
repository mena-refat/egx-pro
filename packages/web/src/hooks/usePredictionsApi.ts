import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  usePredictionsStore,
  type FeedPrediction,
  type LeaderboardEntry,
  type UserPredictionStats,
  type DailyLimits,
} from '../store/usePredictionsStore';
import { PAGINATION } from '../lib/constants';

const API = '/api/predictions';

function getAuthHeaders(accessToken: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (accessToken) h['Authorization'] = `Bearer ${accessToken}`;
  return h;
}

export function usePredictionsApi() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const {
    setFeedPredictions,
    setMyPredictions,
    setLeaderboard,
    setDailyLimits,
    setFeedLoading,
    setMyLoading,
    setLeaderboardLoading,
    setLimitsLoading,
    setLikeOnFeed,
    setLikeOnMy,
    feedFilter,
  } = usePredictionsStore();

  const fetchFeed = useCallback(
    async (page = 1, ticker?: string) => {
      if (!accessToken) return;
      setFeedLoading(true);
      try {
        const q = new URLSearchParams({
          page: String(page),
          limit: String(PAGINATION.defaultLimit),
          filter: feedFilter,
        });
        if (ticker) q.set('ticker', ticker);
        const res = await fetch(`${API}/feed?${q}`, { headers: getAuthHeaders(accessToken) });
        if (!res.ok) throw new Error('Feed failed');
        const json = await res.json();
        const items = (json.data?.items ?? []) as FeedPrediction[];
        const pag = json.data?.pagination ?? {};
        usePredictionsStore.getState().setFeedPredictions(items, {
          page: pag.page ?? page,
          total: pag.total ?? 0,
          totalPages: pag.totalPages ?? 1,
        });
      } finally {
        setFeedLoading(false);
      }
    },
    [accessToken, feedFilter, setFeedLoading]
  );

  const fetchMy = useCallback(
    async (page = 1, status?: string) => {
      if (!accessToken) return;
      setMyLoading(true);
      try {
        const q = new URLSearchParams({ page: String(page), limit: String(PAGINATION.defaultLimit) });
        if (status) q.set('status', status);
        const res = await fetch(`${API}/my?${q}`, { headers: getAuthHeaders(accessToken) });
        if (!res.ok) throw new Error('My predictions failed');
        const json = await res.json();
        const items = (json.data?.items ?? []) as FeedPrediction[];
        const pag = json.data?.pagination ?? {};
        setMyPredictions(items, {
          page: pag.page ?? page,
          total: pag.total ?? 0,
          totalPages: pag.totalPages ?? 1,
        });
      } finally {
        setMyLoading(false);
      }
    },
    [accessToken, setMyLoading]
  );

  const fetchLeaderboard = useCallback(
    async (period: 'alltime' | 'month' | 'week' = 'alltime') => {
      if (!accessToken) return;
      setLeaderboardLoading(true);
      try {
        const res = await fetch(`${API}/leaderboard?period=${period}`, {
          headers: getAuthHeaders(accessToken),
        });
        if (!res.ok) throw new Error('Leaderboard failed');
        const json = await res.json();
        const items = (json.data?.items ?? []) as LeaderboardEntry[];
        setLeaderboard(items);
      } finally {
        setLeaderboardLoading(false);
      }
    },
    [accessToken, setLeaderboardLoading]
  );

  const fetchLimits = useCallback(async () => {
    if (!accessToken) return;
    setLimitsLoading(true);
    try {
      const res = await fetch(`${API}/limits`, { headers: getAuthHeaders(accessToken) });
      if (!res.ok) throw new Error('Limits failed');
      const json = await res.json();
      const data = json.data as DailyLimits;
      setDailyLimits(data ?? null);
    } finally {
      setLimitsLoading(false);
    }
  }, [accessToken, setLimitsLoading]);

  const createPrediction = useCallback(
    async (body: {
      ticker: string;
      mode: 'TIER' | 'EXACT';
      // TIER
      direction?: 'UP' | 'DOWN';
      moveTier?: 'LIGHT' | 'MEDIUM' | 'STRONG' | 'EXTREME';
      timeframe?: 'WEEK' | 'MONTH' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'NINE_MONTHS' | 'YEAR';
      // EXACT
      targetPrice?: number;
      expiresAt?: string;
      reason?: string | null;
      isPublic?: boolean;
    }) => {
      if (!accessToken) throw new Error('Unauthorized');
      const res = await fetch(API, {
        method: 'POST',
        headers: getAuthHeaders(accessToken),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data.message as string) || data.error || 'Create failed');
      return data.data;
    },
    [accessToken]
  );

  const deletePrediction = useCallback(
    async (id: string) => {
      if (!accessToken) throw new Error('Unauthorized');
      const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: getAuthHeaders(accessToken) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data.message as string) || data.error || 'Delete failed');
      }
    },
    [accessToken]
  );

  const toggleLike = useCallback(
    async (predictionId: string, source: 'feed' | 'my', currentLikeCount: number, currentlyLiked: boolean) => {
      if (!accessToken) throw new Error('Unauthorized');
      const nextLiked = !currentlyLiked;
      const nextCount = Math.max(0, currentLikeCount + (nextLiked ? 1 : -1));
      if (source === 'feed') setLikeOnFeed(predictionId, nextLiked, nextCount);
      else setLikeOnMy(predictionId, nextLiked, nextCount);
      try {
        const res = await fetch(`${API}/${predictionId}/like`, {
          method: 'POST',
          headers: getAuthHeaders(accessToken),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg: string = json?.message ?? json?.error ?? '';
          throw new Error(msg || 'Like failed');
        }
        const liked = json?.data?.liked ?? nextLiked;
        // If server confirmed our expected toggle, keep the optimistic count.
        // If it returned a different state (de-synced client), revert to original count.
        const finalCount = liked === nextLiked ? nextCount : currentLikeCount;
        if (source === 'feed') setLikeOnFeed(predictionId, liked, Math.max(0, finalCount));
        else setLikeOnMy(predictionId, liked, Math.max(0, finalCount));
        return liked;
      } catch (err) {
        if (source === 'feed') setLikeOnFeed(predictionId, currentlyLiked, currentLikeCount);
        else setLikeOnMy(predictionId, currentlyLiked, currentLikeCount);
        const { toast } = await import('../store/toastStore');
        const i18n = (await import('../lib/i18n')).default;
        const serverMsg = err instanceof Error ? err.message : '';
        toast.error(serverMsg || i18n.t('errors.likeFailed', { ns: 'common' }));
        throw err;
      }
    },
    [accessToken, setLikeOnFeed, setLikeOnMy]
  );

  const fetchMyStats = useCallback(
    async (username: string) => {
      if (!accessToken) return null;
      const res = await fetch(`/api/predictions/stats/${encodeURIComponent(username)}`, {
        headers: getAuthHeaders(accessToken),
      });
      if (!res.ok) return null;
      const json = await res.json();
      const data = json.data as UserPredictionStats | { rank: string; totalPredictions: number; private?: boolean };
      if (data && 'private' in data && data.private) return data as UserPredictionStats;
      return data as UserPredictionStats;
    },
    [accessToken]
  );

  return {
    fetchFeed,
    fetchMy,
    fetchLeaderboard,
    fetchLimits,
    fetchMyStats,
    createPrediction,
    deletePrediction,
    toggleLike,
  };
}
