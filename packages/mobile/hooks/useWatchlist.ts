import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../lib/api/client';
import type { Stock } from '../types/stock';

export function useWatchlist() {
  const [items, setItems] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiClient.get('/api/watchlist', { signal });
      const raw = (res.data as { items?: Stock[] })?.items ?? res.data;
      if (!signal?.aborted && mountedRef.current)
        setItems(Array.isArray(raw) ? raw : []);
    } catch {
      if (!signal?.aborted && mountedRef.current) setItems([]);
    } finally {
      if (!signal?.aborted && mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);

  const refetchCtrlRef = useRef<AbortController | null>(null);

  const refetch = useCallback(() => {
    refetchCtrlRef.current?.abort();
    const c = new AbortController();
    refetchCtrlRef.current = c;
    return load(c.signal);
  }, [load]);

  return { items, loading, refetch };
}
