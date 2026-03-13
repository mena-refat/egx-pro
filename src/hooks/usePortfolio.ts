import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
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

  // Calculate stats
  let totalValue = 0;
  let totalCost = 0;

  holdings.forEach((holding) => {
    const currentPrice = livePrices[holding.ticker]?.price || holding.avgPrice;
    totalValue += currentPrice * holding.shares;
    totalCost += holding.avgPrice * holding.shares;
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
    stats: {
      totalValue,
      totalCost,
      totalGain,
      gainPercent,
    },
  };
}
