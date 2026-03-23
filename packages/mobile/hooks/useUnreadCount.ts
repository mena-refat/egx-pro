import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import apiClient from '../lib/api/client';

// ── Shared singleton state ────────────────────────────────────────
// One source of truth for all hook instances across the app.
// Any component can call resetUnreadCount() to instantly zero the badge
// without a network round-trip.
let _count = 0;
const _listeners = new Set<(n: number) => void>();

function _publish(n: number) {
  _count = n;
  _listeners.forEach((l) => l(n));
}

/** Instantly zeros the tab-bar badge everywhere. Call this when the user opens notifications. */
export function resetUnreadCount() {
  _publish(0);
}

export function useUnreadCount() {
  const [count, setCount] = useState(_count);
  const mountedRef = useRef(true);

  useEffect(() => {
    _listeners.add(setCount);
    return () => {
      mountedRef.current = false;
      _listeners.delete(setCount);
    };
  }, []);

  const fetchCount = useCallback(() => {
    const c = new AbortController();
    apiClient.get('/api/notifications?limit=1', { signal: c.signal })
      .then((res) => {
        const data = res.data as { unreadCount?: number };
        if (mountedRef.current) _publish(data.unreadCount ?? 0);
      })
      .catch(() => null);
    return () => c.abort();
  }, []);

  // Refetches whenever the tab that hosts this hook comes into focus.
  useFocusEffect(useCallback(() => fetchCount(), [fetchCount]));

  return count;
}
