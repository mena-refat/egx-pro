import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import type { Stock, PortfolioHolding } from '../types';

export function useDashboardStats(isAuthenticated: boolean, pathname: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [stats, setStats] = useState({ totalValue: 0, topPerformer: '--', topPerformerChange: 0 });

  const fetchDashboardData = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [holdingsRes, stocksRes, watchlistRes] = await Promise.all([
        fetch('/api/portfolio', { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch('/api/stocks/prices'),
        fetch('/api/watchlist', { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      if (!holdingsRes.ok || !stocksRes.ok || !watchlistRes.ok) return;
      const holdingsData = await holdingsRes.json();
      const stocks = await stocksRes.json();
      const watchlistData = await watchlistRes.json();
      const holdings = Array.isArray(holdingsData) ? holdingsData : (holdingsData.holdings || []);
      if (!Array.isArray(holdings) || !Array.isArray(stocks) || !Array.isArray(watchlistData)) return;
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
    } catch (err) {
      console.error('Dashboard fetch error', err);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated && (pathname === '/' || pathname === '/dashboard' || pathname === '/goals') && accessToken) fetchDashboardData();
  }, [isAuthenticated, pathname, fetchDashboardData, accessToken]);

  return stats;
}
