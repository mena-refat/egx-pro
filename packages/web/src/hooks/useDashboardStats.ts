import { useState, useCallback, useEffect } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { Stock, PortfolioHolding } from '../types';

export function useDashboardStats(isAuthenticated: boolean, pathname: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [stats, setStats] = useState({ totalValue: 0, topPerformer: '--', topPerformerChange: 0 });

  const fetchDashboardData = useCallback(async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      const [holdingsRes, stocksRes, watchlistRes] = await Promise.all([
        api.get('/portfolio', { signal }),
        api.get('/stocks/prices', { signal }),
        api.get('/watchlist', { signal }),
      ]);
      const holdingsData = holdingsRes.data;
      const stocksPayload = stocksRes.data;
      const watchlistData = watchlistRes.data;
      if (signal?.aborted) return;
      const holdingsInner = (holdingsData as { data?: { holdings?: unknown[] } })?.data ?? holdingsData;
      const holdings = Array.isArray(holdingsInner) ? holdingsInner : (holdingsInner?.holdings || (holdingsData as { holdings?: unknown[] }).holdings || (holdingsData as { items?: unknown[] }).items || []);
      const stocks = (stocksPayload as { data?: unknown[] })?.data ?? stocksPayload;
      const watchlistItems = watchlistData?.items ?? (watchlistData as { data?: { items?: unknown[] } })?.data?.items ?? watchlistData;
      if (!Array.isArray(holdings) || !Array.isArray(stocks) || !Array.isArray(watchlistItems)) return;
      const priceMap: Record<string, Stock> = {};
      stocks.forEach((s: Stock) => priceMap[s.ticker] = s);
      let totalValue = 0, bestStock = '--', bestChange = -Infinity;
      holdings.forEach((h: PortfolioHolding) => {
        const current = priceMap[h.ticker];
        if (current) {
          totalValue += h.shares * current.price;
          if (current.change > bestChange) { bestChange = current.change; bestStock = h.ticker; }
        }
      });
      setStats({ totalValue, topPerformer: bestStock, topPerformerChange: bestChange === -Infinity ? 0 : bestChange });
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return;
      // Avoid console in production; errors are silent for dashboard stats
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isAuthenticated || (pathname !== '/' && pathname !== '/dashboard' && pathname !== '/goals') || !accessToken) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      void fetchDashboardData(controller.signal);
    });
    return () => controller.abort();
  }, [isAuthenticated, pathname, fetchDashboardData, accessToken]);

  return stats;
}
