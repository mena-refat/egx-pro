import { useState, useEffect } from 'react';
import api from '../lib/api';

export interface AccuracyStats {
  total: number;
  checked: number;
  avgAccuracy: number;
  hitRate: number;
}

export interface CheckedAnalysis {
  id: string;
  ticker: string;
  verdict: string | null;
  priceAtAnalysis: number | null;
  targetPrice: number | null;
  priceAfter7d: number | null;
  priceAfter30d: number | null;
  accuracyScore: number | null;
  accuracyNote: string | null;
  createdAt: string;
  checkedAt: string | null;
}

export function useAIAccuracy() {
  const [stats, setStats] = useState<AccuracyStats | null>(null);
  const [recent, setRecent] = useState<CheckedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: { stats: AccuracyStats; recentChecked: CheckedAnalysis[] } }>('/analysis/accuracy')
      .then((res) => {
        const d = res.data?.data ?? (res.data as { stats?: AccuracyStats; recentChecked?: CheckedAnalysis[] });
        if (d?.stats) setStats(d.stats);
        if (d?.recentChecked) setRecent(d.recentChecked);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { stats, recent, loading };
}
