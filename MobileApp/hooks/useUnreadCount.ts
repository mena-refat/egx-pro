import { useState, useEffect, useCallback, useRef } from 'react';
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
      }).catch(() => null);
    return () => c.abort();
  }, []);

  useEffect(() => fetchCount(), [fetchCount]);
  useFocusEffect(useCallback(() => fetchCount(), [fetchCount]));
  return count;
}
