import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export type QuoteResult = {
  ticker: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  previousClose: number | null;
  volume: number | null;
  currency: string | null;
  symbol: string | null;
  longName: string | null;
  marketTime: string | null;
  cachedAt: string;
  stale?: boolean;
};

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useStockQuote(ticker: string | null) {
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async (signal?: AbortSignal) => {
    if (!ticker?.trim()) {
      setQuote(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: QuoteResult }>(`/stocks/quote/${encodeURIComponent(ticker.trim())}`, {
        signal,
      });
      const data = res.data?.data ?? res.data;
      if (data) setQuote(data);
      else setQuote(null);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ERR_CANCELED') return;
      const msg = (err as { response?: { data?: { error?: string }; status?: number } })?.response?.data?.error;
      setError(typeof msg === 'string' ? msg : 'Failed to load quote');
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    const controller = new AbortController();
    fetchQuote(controller.signal);

    const id = setInterval(() => {
      fetchQuote(controller.signal);
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(id);
      controller.abort();
    };
  }, [fetchQuote]);

  return { quote, loading, error, refetch: () => fetchQuote() };
}
