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
    let cancelled = false;
    setLoading(true);
    api
      .get<Stock[]>('/stocks/prices')
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        const found = list.find((s: Stock) => s.ticker.toUpperCase() === ticker.toUpperCase());
        if (found) setStock(found);
        else navigate('/stocks');
      })
      .catch(() => {
        if (!cancelled) navigate('/stocks');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
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
