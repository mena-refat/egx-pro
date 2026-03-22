import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import apiClient from '../lib/api/client';

export function useUnreadCount() {
  const [count, setCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const fetchCount = useCallback(() => {
    const c = new AbortController();
    apiClient.get('/api/notifications?limit=1', { signal: c.signal })
      .then((res) => {
        const data = res.data as { unreadCount?: number };
        if (mountedRef.current) setCount(data.unreadCount ?? 0);
      })
      .catch(() => null);
    return () => c.abort();
  }, []);

  // useFocusEffect fires on initial focus AND every subsequent focus —
  // no separate useEffect needed (avoids double-fetch on mount).
  useFocusEffect(useCallback(() => fetchCount(), [fetchCount]));

  return count;
}
