import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../lib/api/client';
import { useAuthStore } from '../store/authStore';

type PredictionStatsResponse = {
  accuracyRate?: number;
  // kept intentionally loose; API may also include rank/private/totalPredictions
  [key: string]: unknown;
};

export function usePredictionScore() {
  const username = useAuthStore((s) => s.user?.username);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const fetchScore = useCallback(
    async (signal?: AbortSignal) => {
      if (!username) return;

      setLoading(true);
      try {
        const res = await apiClient.get(`/api/predictions/stats/${username}`, { signal });
        const data = res.data as PredictionStatsResponse;
        const next =
          typeof data?.accuracyRate === 'number' ? data.accuracyRate : null;
        if (!signal?.aborted && mountedRef.current) setScore(next);
      } catch {
        if (!signal?.aborted && mountedRef.current) setScore(null);
      } finally {
        if (!signal?.aborted && mountedRef.current) setLoading(false);
      }
    },
    [username],
  );

  useEffect(() => {
    if (!username) return;
    const c = new AbortController();
    void fetchScore(c.signal);
    return () => c.abort();
  }, [username, fetchScore]);

  const refetch = useCallback(() => {
    if (!username) return Promise.resolve();
    const c = new AbortController();
    return fetchScore(c.signal);
  }, [fetchScore, username]);

  return { score, loading, refetch };
}

