import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StockAnalysis from '../components/features/stocks/StockAnalysis';
import { Skeleton } from '../components/ui/Skeleton';
import api from '../lib/api';
import { Stock } from '../types';

function useStockDetail(ticker: string | undefined) {
  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  useEffect(() => {
    if (!ticker) {
      return;
    }
    const controller = new AbortController();
    void (async () => {
      if (!mountedRef.current) return;
      setLoading(true);
      try {
        const res = await api.get<Stock[] | { data: Stock[] }>('/stocks/prices', { signal: controller.signal });
        if (controller.signal.aborted || !mountedRef.current) return;
        const raw = (res.data as { data?: Stock[] })?.data ?? res.data;
        const list = Array.isArray(raw) ? raw : [];
        const found = list.find((s: Stock) => s.ticker.toUpperCase() === ticker.toUpperCase());
        if (!mountedRef.current) return;
        setStock(found ?? null);
      } catch (err: unknown) {
        if (err instanceof Error && (err.name === 'AbortError' || (err as { code?: string }).code === 'ERR_CANCELED')) return;
      } finally {
        if (!controller.signal.aborted && mountedRef.current) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [ticker]);

  return { stock, loading };
}

export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const { stock, loading } = useStockDetail(ticker);

  if (!ticker) return null;

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton height={48} className="w-48 rounded-lg" />
        <Skeleton height={256} className="w-full rounded-xl" />
        <Skeleton height={128} className="w-full rounded-xl" />
      </div>
    );
  }

  if (!stock) return null;

  return (
    <StockAnalysis
      stock={stock}
      onBack={() => navigate('/stocks')}
    />
  );
}
