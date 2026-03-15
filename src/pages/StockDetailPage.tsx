import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StockAnalysis from '../components/StockAnalysis';
import { Skeleton } from '../components/ui/Skeleton';
import api from '../lib/api';
import { Stock } from '../types';

export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticker) {
      navigate('/stocks');
      return;
    }
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      try {
        const res = await api.get<Stock[] | { data: Stock[] }>('/stocks/prices', { signal: controller.signal });
        if (controller.signal.aborted) return;
        const raw = (res.data as { data?: Stock[] })?.data ?? res.data;
        const list = Array.isArray(raw) ? raw : [];
        const found = list.find((s: Stock) => s.ticker.toUpperCase() === ticker.toUpperCase());
        if (found) setStock(found);
        else navigate('/stocks');
      } catch (err: unknown) {
        if (err instanceof Error && (err.name === 'AbortError' || (err as { code?: string }).code === 'ERR_CANCELED')) return;
        navigate('/stocks');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [ticker, navigate]);

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
