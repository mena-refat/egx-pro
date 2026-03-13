import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import type { Stock, PortfolioHolding } from '../types';

export function useDashboardStats(isAuthenticated: boolean, pathname: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [stats, setStats] = useState({ totalValue: 0, topPerformer: '--', topPerformerChange: 0 });

  const fetchDashboardData = useCallback(async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      const [holdingsRes, stocksRes, watchlistRes] = await Promise.all([
        fetch('/api/portfolio', { headers: { Authorization: `Bearer ${accessToken}` }, signal }),
        fetch('/api/stocks/prices', { signal }),
        fetch('/api/watchlist', { headers: { Authorization: `Bearer ${accessToken}` }, signal }),
      ]);
      if (signal?.aborted) return;
      if (!holdingsRes.ok || !stocksRes.ok || !watchlistRes.ok) return;
      const [holdingsData, stocksPayload, watchlistData] = await Promise.all([
        holdingsRes.json(),
        stocksRes.json(),
        watchlistRes.json(),
      ]);
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
    fetchDashboardData(controller.signal);
    return () => controller.abort();
  }, [isAuthenticated, pathname, fetchDashboardData, accessToken]);

  return stats;
}
