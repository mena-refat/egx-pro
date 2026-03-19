import { useState, useCallback, useEffect } from 'react';
import api from '../lib/api';
import type { DashboardMarketOverview } from '../components/features/dashboard/types';
import type { Stock } from '../types';

export function useDashboardMarketWatchlist() {
  const [marketOverview, setMarketOverview] = useState<DashboardMarketOverview | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [showMarketOverview, setShowMarketOverview] = useState(true);
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  const fetchMarketOverview = useCallback(async (signal?: AbortSignal) => {
    setMarketLoading(true);
    setMarketError(null);
    try {
      const res = await api.get('/stocks/market/overview', { signal });
      if (!signal?.aborted) setMarketOverview((res.data as { data?: DashboardMarketOverview })?.data ?? res.data);
    } catch (err: unknown) {
      if (err instanceof Error && (err.name === 'AbortError' || (err as { code?: string }).code === 'ERR_CANCELED')) return;
      if (!signal?.aborted) setMarketError(err instanceof Error ? err.message : 'Failed to fetch market overview');
    } finally {
      if (!signal?.aborted) setMarketLoading(false);
    }
  }, []);

  const fetchWatchlist = useCallback(async (signal?: AbortSignal) => {
    setWatchlistLoading(true);
    try {
      const res = await api.get('/watchlist', { signal });
      const items = (res.data as { items?: Stock[] })?.items;
      if (!signal?.aborted) setWatchlist(Array.isArray(items) ? items : []);
    } catch (err: unknown) {
      if (err instanceof Error && (err.name === 'AbortError' || (err as { code?: string }).code === 'ERR_CANCELED')) return;
      if (!signal?.aborted) setWatchlist([]);
    } finally {
      if (!signal?.aborted) setWatchlistLoading(false);
    }
  }, []);

  useEffect(() => {
    const marketController = new AbortController();
    const watchlistController = new AbortController();
    fetchMarketOverview(marketController.signal);
    fetchWatchlist(watchlistController.signal);
    return () => {
      marketController.abort();
      watchlistController.abort();
    };
  }, [fetchMarketOverview, fetchWatchlist]);

  useEffect(() => {
    const onWatchlistChanged = () => fetchWatchlist();
    window.addEventListener('watchlist-changed', onWatchlistChanged);
    return () => window.removeEventListener('watchlist-changed', onWatchlistChanged);
  }, [fetchWatchlist]);

  const toggleMarketOverview = useCallback(() => setShowMarketOverview((v) => !v), []);

  const retryMarketOverview = useCallback(async () => {
    setMarketError(null);
    await fetchMarketOverview();
  }, [fetchMarketOverview]);

  return {
    marketOverview,
    marketLoading,
    marketError,
    showMarketOverview,
    toggleMarketOverview,
    retryMarketOverview,
    watchlist,
    watchlistLoading,
    refetchWatchlist: fetchWatchlist,
  };
}
