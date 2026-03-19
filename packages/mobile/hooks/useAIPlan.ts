import { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/api/client';
import { useAuthStore } from '../store/authStore';

export function useAIPlan() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const [used, setUsed] = useState(0);
  const [quota, setQuota] = useState(3);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!isAuth) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiClient.get('/api/billing/plan');
      const a = (res.data as { analysis?: { used: number; quota: number } })?.analysis;
      if (a) {
        setUsed(a.used);
        setQuota(a.quota);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [isAuth]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { used, quota, loading, refetch: fetch };
}

