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

export function useMultipleQuotes(tickers: string[]) {
  const [quotes, setQuotes] = useState<Record<string, QuoteResult | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = useCallback(async (signal?: AbortSignal) => {
    const list = tickers.filter((t) => t?.trim()).map((t) => t.trim()).slice(0, 50);
    if (list.length === 0) {
      setQuotes({});
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/stocks/quotes', { tickers: list }, { signal });
      const payload = res.data as unknown;
      const data = payload && typeof payload === 'object' && !Array.isArray(payload)
        ? payload as Record<string, QuoteResult | null>
        : {};
      setQuotes(data);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ERR_CANCELED') return;
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(typeof msg === 'string' ? msg : 'Failed to load quotes');
      setQuotes({});
    } finally {
      setLoading(false);
    }
  }, [tickers.join(',')]);

  useEffect(() => {
    const controller = new AbortController();
    fetchQuotes(controller.signal);
    return () => controller.abort();
  }, [fetchQuotes]);

  return { quotes, loading, error, refetch: () => fetchQuotes() };
}
