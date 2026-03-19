import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { cachedGet } from '../lib/queryCache';
import type { MarketOverview } from '../components/market/types';
import type { Stock } from '../types';
import type { MarketNewsItem } from '../components/market/types';

export function useMarketPage() {
  const { t } = useTranslation('common');
  const mountedRef = useRef(true);
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [news, setNews] = useState<MarketNewsItem[]>([]);
  const [newsFilter, setNewsFilter] = useState<'all' | 'interests'>('interests');
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(
    async (signal?: AbortSignal) => {
      setLoadingOverview(true);
      setError(null);
      try {
        const data = await cachedGet<MarketOverview>('/stocks/market/overview', 30_000);
        if (mountedRef.current && !signal?.aborted) setOverview(data);
      } catch (err: unknown) {
        if (err instanceof Error && (err.name === 'AbortError' || (err as { code?: string }).code === 'ERR_CANCELED')) return;
        if (!signal?.aborted) setError(t('market.loadError'));
      } finally {
        if (!signal?.aborted) setLoadingOverview(false);
      }
    },
    [t]
  );

  const fetchStocks = useCallback(async (signal?: AbortSignal) => {
    setLoadingStocks(true);
    try {
      const res = await api.get<Stock[] | { data: Stock[] }>('/stocks/prices', { signal });
      const raw = (res.data as { data?: Stock[] })?.data ?? res.data;
      if (!signal?.aborted) setStocks(Array.isArray(raw) ? raw : []);
    } catch (err: unknown) {
      if (err instanceof Error && (err.name === 'AbortError' || (err as { code?: string }).code === 'ERR_CANCELED')) return;
      if (!signal?.aborted) setStocks([]);
    } finally {
      if (!signal?.aborted) setLoadingStocks(false);
    }
  }, []);

  const fetchNews = useCallback(async (filter: 'all' | 'interests' = 'all', signal?: AbortSignal) => {
    setLoadingNews(true);
    try {
      const endpoint = filter === 'interests' ? '/news/interests' : '/news/market';
      const res = await api.get<MarketNewsItem[] | { data: MarketNewsItem[] }>(endpoint, { signal });
      const raw = (res.data as { data?: MarketNewsItem[] })?.data ?? res.data;
      if (!signal?.aborted) setNews(Array.isArray(raw) ? raw : []);
    } catch {
      if (!signal?.aborted) setNews([]);
    } finally {
      if (!signal?.aborted) setLoadingNews(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    fetchOverview(controller.signal);
    fetchStocks(controller.signal);
    fetchNews('all', controller.signal);
    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [fetchOverview, fetchStocks, fetchNews]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchOverview(), fetchStocks(), fetchNews(newsFilter)]);
    setRefreshing(false);
  }, [fetchOverview, fetchStocks, fetchNews, newsFilter]);

  return {
    overview,
    stocks,
    news,
    newsFilter,
    setNewsFilter: (f: 'all' | 'interests') => { setNewsFilter(f); fetchNews(f); },
    loadingOverview,
    loadingStocks,
    loadingNews,
    refreshing,
    error,
    refreshAll,
    fetchOverview,
  };
}
