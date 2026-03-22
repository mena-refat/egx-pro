import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import apiClient from '../lib/api/client';

export function useActivePredictions() {
  const [count, setCount] = useState(0);
  const mountedRef        = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const fetch = useCallback(() => {
    const c = new AbortController();
    // Use /my to get only the current user's predictions (not the community feed)
    apiClient.get('/api/predictions/my', { signal: c.signal })
      .then((res) => {
        const data  = res.data as { items?: { status: string }[] } | { status: string }[];
        const items = Array.isArray(data) ? data : (data.items ?? []);
        const pending = items.filter((p) => p.status === 'PENDING').length;
        if (mountedRef.current) setCount(pending);
      })
      .catch(() => null);
    return () => c.abort();
  }, []);

  // useFocusEffect fires on initial focus AND on every subsequent focus —
  // no separate useEffect needed (avoids double-fetch on mount).
  useFocusEffect(useCallback(() => fetch(), [fetch]));

  return count;
}
