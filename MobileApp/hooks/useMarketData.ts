import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import apiClient from '../lib/api/client';
import type { Stock, MarketOverview } from '../types/stock';

const CACHE: Record<string, { data: unknown; ts: number }> = {};

async function cachedGet<T>(url: string, ttl = 30_000): Promise<T> {
  const hit = CACHE[url];
  if (hit && Date.now() - hit.ts < ttl) return hit.data as T;
  const res = await apiClient.get<T>(url);
  const data = (res.data as { data?: T })?.data ?? res.data;
  CACHE[url] = { data, ts: Date.now() };
  return data as T;
}

export function useMarketData() {
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [news, setNews] = useState<
    { id: string; title: string; publishedAt: string; source: string; url: string }[]
  >([]);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const fetchOverview = useCallback(async () => {
    try {
      const data = await cachedGet<MarketOverview>('/api/stocks/market/overview', 30_000);
      if (mountedRef.current) setOverview(data);
    } catch {
      // silent
    } finally {
      if (mountedRef.current) setLoadingOverview(false);
    }
  }, []);

  const fetchStocks = useCallback(async () => {
    try {
      const raw = await cachedGet<Stock[]>('/api/stocks/prices', 60_000);
      const list = Array.isArray(raw) ? raw : [];
      if (mountedRef.current) setStocks(list);
    } catch {
      // silent
    } finally {
      if (mountedRef.current) setLoadingStocks(false);
    }
  }, []);

  const fetchNews = useCallback(async () => {
    try {
      const raw = await cachedGet<unknown[]>('/api/news/market', 120_000);
      if (mountedRef.current) setNews(Array.isArray(raw) ? (raw as typeof news) : []);
    } catch {
      // silent
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    delete CACHE['/api/stocks/prices'];
    delete CACHE['/api/stocks/market/overview'];
    delete CACHE['/api/news/market'];
    await Promise.all([fetchOverview(), fetchStocks(), fetchNews()]);
    setRefreshing(false);
  }, [fetchOverview, fetchStocks, fetchNews]);

  useEffect(() => {
    void Promise.all([fetchOverview(), fetchStocks(), fetchNews()]);

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void Promise.all([fetchOverview(), fetchStocks()]);
    });
    return () => sub.remove();
  }, [fetchOverview, fetchStocks, fetchNews]);

  return { overview, stocks, news, loadingStocks, loadingOverview, refreshing, refresh };
}

export function usePortfolioData() {
  const [holdings, setHoldings] = useState<
    {
      id: string;
      ticker: string;
      shares: number;
      avgPrice: number;
      currentPrice?: number;
      currentValue?: number;
      gainLoss?: number;
      gainLossPercent?: number;
    }[]
  >([]);
  const [summary, setSummary] = useState({
    totalValue: 0,
    totalCost: 0,
    totalGainLoss: 0,
    totalGainLossPercent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const fetch = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiClient.get('/api/portfolio', { signal });
      const payload = (res.data as {
        holdings?: typeof holdings;
        summary?: typeof summary;
      }) ?? { holdings: undefined, summary: undefined };
      if (!signal?.aborted && mountedRef.current) {
        setHoldings(payload.holdings ?? []);
        setSummary(
          payload.summary ?? {
            totalValue: 0,
            totalCost: 0,
            totalGainLoss: 0,
            totalGainLossPercent: 0,
          },
        );
      }
    } catch {
      // silent
    } finally {
      if (!signal?.aborted && mountedRef.current) setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, [fetch]);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetch(ctrl.signal);
    return () => ctrl.abort();
  }, [fetch]);

  return { holdings, summary, loading, refreshing, refresh, refetch: fetch };
}

