import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export interface AIPlanState {
  used: number;
  quota: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAIPlan(isAuthenticated: boolean): AIPlanState {
  const [used, setUsed] = useState(0);
  const [quota, setQuota] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!isAuthenticated) {
      setUsed(0);
      setQuota(3);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data?: { analysis?: { used: number; quota: number } } }>('/billing/plan');
      const a = res.data?.data?.analysis ?? (res.data as { analysis?: { used: number; quota: number } })?.analysis;
      if (a && Number.isFinite(a.quota)) {
        setUsed(a.used);
        setQuota(a.quota);
      }
    } catch {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { used, quota, loading, error, refetch };
}
