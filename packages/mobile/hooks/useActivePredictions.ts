import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import apiClient from '../lib/api/client';

export function useActivePredictions() {
  const [count, setCount]   = useState(0);
  const mountedRef          = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const fetch = useCallback(() => {
    const c = new AbortController();
    apiClient.get('/api/predictions', { signal: c.signal })
      .then((res) => {
        const data  = res.data as { items?: { status: string }[] } | { status: string }[];
        const items = Array.isArray(data) ? data : (data.items ?? []);
        const pending = items.filter((p) => p.status === 'PENDING').length;
        if (mountedRef.current) setCount(pending);
      }).catch(() => null);
    return () => c.abort();
  }, []);

  useEffect(() => fetch(), [fetch]);
  useFocusEffect(useCallback(() => fetch(), [fetch]));
  return count;
}
