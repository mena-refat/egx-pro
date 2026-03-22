import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import apiClient from '../lib/api/client';
import type { Stock, MarketOverview } from '../types/stock';

const CACHE: Record<string, { data: unknown; ts: number }> = {};

async function cachedGet<T>(url: string, ttl = 30_000, signal?: AbortSignal): Promise<T> {
  const hit = CACHE[url];
  if (hit && Date.now() - hit.ts < ttl) return hit.data as T;
  const res = await apiClient.get<T>(url, { signal });
  const data = res.data as T;
  CACHE[url] = { data, ts: Date.now() };
  return data as T;
}

export function useMarketData() {
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [news, setNews] = useState<
    {
      id?: string;
      title: string;
      url: string;
      source: string;
      sourceType?: string;
      publishedAt: string;
      summary?: string;
      sentiment?: string | null;
      tickers?: string[];
      isMarketWide?: boolean;
    }[]
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

  const fetchOverview = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await cachedGet<MarketOverview>('/api/stocks/market/overview', 30_000, signal);
      if (!signal?.aborted && mountedRef.current) setOverview(data);
    } catch {
      // silent — cancelled requests throw but we don't surface that
    } finally {
      if (!signal?.aborted && mountedRef.current) setLoadingOverview(false);
    }
  }, []);

  const fetchStocks = useCallback(async (signal?: AbortSignal) => {
    try {
      const raw = await cachedGet<Stock[]>('/api/stocks/prices', 60_000, signal);
      const list = Array.isArray(raw) ? raw : [];
      if (!signal?.aborted && mountedRef.current) setStocks(list);
    } catch {
      // silent
    } finally {
      if (!signal?.aborted && mountedRef.current) setLoadingStocks(false);
    }
  }, []);

  const fetchNews = useCallback(async (signal?: AbortSignal) => {
    try {
      const raw = await cachedGet<unknown[]>('/api/news/market', 120_000, signal);
      if (!signal?.aborted && mountedRef.current) setNews(Array.isArray(raw) ? (raw as typeof news) : []);
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
    if (mountedRef.current) setRefreshing(false);
  }, [fetchOverview, fetchStocks, fetchNews]);

  useEffect(() => {
    const ctrl = new AbortController();
    void Promise.all([fetchOverview(ctrl.signal), fetchStocks(ctrl.signal), fetchNews(ctrl.signal)]);

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      // AppState-triggered refreshes don't need cancellation (fire-and-forget)
      if (state === 'active') void Promise.all([fetchOverview(), fetchStocks()]);
    });
    return () => {
      ctrl.abort();
      sub.remove();
    };
  }, [fetchOverview, fetchStocks, fetchNews]);

  return { overview, stocks, news, loadingStocks, loadingOverview, refreshing, refresh };
}

type RawHolding = {
  id: string;
  ticker: string;
  shares: number;
  avgPrice: number;
  buyDate?: string;
  currentPrice?: number;
  currentValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
};

export type PortfolioHolding = RawHolding & { ids: string[] };

function groupHoldingsByTicker(raw: RawHolding[]): PortfolioHolding[] {
  const map = new Map<string, PortfolioHolding>();
  for (const h of raw) {
    const existing = map.get(h.ticker);
    if (existing) {
      const totalShares = existing.shares + h.shares;
      existing.avgPrice = (existing.avgPrice * existing.shares + h.avgPrice * h.shares) / totalShares;
      existing.shares = totalShares;
      existing.ids.push(h.id);
    } else {
      map.set(h.ticker, { ...h, ids: [h.id] });
    }
  }
  return Array.from(map.values());
}

export function usePortfolioData() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
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
        holdings?: RawHolding[];
        summary?: typeof summary;
      }) ?? { holdings: undefined, summary: undefined };
      if (!signal?.aborted && mountedRef.current) {
        setHoldings(groupHoldingsByTicker(payload.holdings ?? []));
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
    if (mountedRef.current) setRefreshing(false);
  }, [fetch]);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetch(ctrl.signal);
    return () => ctrl.abort();
  }, [fetch]);

  return { holdings, summary, loading, refreshing, refresh, refetch: fetch };
}

