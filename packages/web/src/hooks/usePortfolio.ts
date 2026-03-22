import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { clearCache } from '../lib/queryCache';
import { PortfolioHolding } from '../types';

export function usePortfolio(livePrices: Record<string, { price: number }>) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/portfolio', { signal });
      if (signal?.aborted) return;
      const payload = (response.data as { data?: { holdings?: PortfolioHolding[] } })?.data ?? response.data;
      setHoldings(Array.isArray(payload) ? payload : (payload?.holdings ?? []));
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ERR_CANCELED') return;
      if (err && typeof err === 'object' && 'response' in err) {
        setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to fetch portfolio');
      } else {
        setError('Failed to fetch portfolio');
      }
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => fetchPortfolio(), [fetchPortfolio]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPortfolio(controller.signal);
    return () => controller.abort();
  }, [fetchPortfolio]);

  const addHolding = async (data: { ticker: string; shares: number; price: number; date: string }) => {
    try {
      await api.post('/portfolio/add', {
        ticker: data.ticker,
        shares: data.shares,
        purchasePrice: data.price,
        purchaseDate: data.date,
      });
      clearCache('/portfolio');
      await fetchPortfolio();
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { error?: string; code?: string } } }).response?.data : undefined;
      const errorMessage = data?.error || 'Failed to add holding';
      const e = new Error(errorMessage, { cause: err });
      if (data?.error === 'PORTFOLIO_LIMIT_REACHED') (e as Error & { code?: string }).code = 'PORTFOLIO_LIMIT_REACHED';
      throw e;
    }
  };

  const removeHolding = async (id: string) => {
    try {
      await api.delete(`/portfolio/${id}`);
      clearCache('/portfolio');
      await fetchPortfolio();
    } catch (err: unknown) {
      let errorCode = 'Failed to remove holding';
      if (err && typeof err === 'object') {
        if ('error' in err && typeof (err as { error: string }).error === 'string') {
          errorCode = (err as { error: string }).error;
        } else if ('response' in err) {
          const res = (err as { response?: { data?: { error?: string } } }).response;
          if (res?.data && typeof res.data === 'object' && 'error' in res.data && typeof (res.data as { error: string }).error === 'string') {
            errorCode = (res.data as { error: string }).error;
          }
        }
      }
      throw new Error(errorCode, { cause: err });
    }
  };

  const sellHolding = async (data: { ticker: string; shares: number; price: number; date: string }) => {
    try {
      await api.post('/portfolio/add', {
        ticker: data.ticker,
        shares: data.shares,
        purchasePrice: data.price,
        purchaseDate: data.date,
        type: 'SELL',
      });
      clearCache('/portfolio');
      await fetchPortfolio();
    } catch (err: unknown) {
      const resData = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string; code?: string } } }).response?.data
        : undefined;
      const errorMessage = resData?.error || 'Failed to record sell order';
      const e = new Error(errorMessage, { cause: err });
      if (resData?.error === 'INSUFFICIENT_SHARES') (e as Error & { code?: string }).code = 'INSUFFICIENT_SHARES';
      throw e;
    }
  };

  // Calculate stats from net positions (BUY - SELL per ticker)
  const netMap = new Map<string, { shares: number; totalCost: number }>();
  holdings.forEach(h => {
    if (h.type !== 'SELL') {
      const e = netMap.get(h.ticker) ?? { shares: 0, totalCost: 0 };
      e.shares += h.shares;
      e.totalCost += h.avgPrice * h.shares;
      netMap.set(h.ticker, e);
    }
  });
  holdings.forEach(h => {
    if (h.type !== 'SELL') return;
    const e = netMap.get(h.ticker);
    if (!e) return;
    const prev = e.shares;
    e.shares -= h.shares;
    if (prev > 0) e.totalCost = e.totalCost * (e.shares / prev);
  });

  let totalValue = 0;
  let totalCost = 0;
  netMap.forEach(({ shares, totalCost: cost }, ticker) => {
    if (shares <= 0) return;
    const avgPrice = shares > 0 ? cost / shares : 0;
    const currentPrice = livePrices[ticker]?.price || avgPrice;
    totalValue += currentPrice * shares;
    totalCost += cost;
  });

  const totalGain = totalValue - totalCost;
  const gainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  return {
    holdings,
    isLoading,
    error,
    refetch,
    addHolding,
    removeHolding,
    sellHolding,
    stats: {
      totalValue,
      totalCost,
      totalGain,
      gainPercent,
    },
  };
}
