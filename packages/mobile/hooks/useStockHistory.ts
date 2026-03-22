import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../lib/api/client';

export type StockHistoryPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type HistoryRange = '1w' | '1mo' | '3mo' | '6mo' | '1y';

export function useStockHistory(ticker?: string) {
  const [range, setRange] = useState<HistoryRange>('1mo');
  const [history, setHistory] = useState<StockHistoryPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  useEffect(() => {
    if (!ticker) return;
    const controller = new AbortController();
    const run = async () => {
      setLoadingHistory(true);
      try {
        const res = await apiClient.get<StockHistoryPoint[]>(
          `/api/stocks/${ticker}/history`,
          { params: { range }, signal: controller.signal }
        );
        if (mountedRef.current) {
          setHistory(Array.isArray(res.data) ? res.data : []);
        }
      } catch {
        if (mountedRef.current) setHistory([]);
      } finally {
        if (mountedRef.current) setLoadingHistory(false);
      }
    };
    void run();
    return () => controller.abort();
  }, [range, ticker]);

  const changeRange = useCallback((nextRange: HistoryRange) => {
    setRange(nextRange);
  }, []);

  return { history, range, changeRange, loadingHistory };
}
