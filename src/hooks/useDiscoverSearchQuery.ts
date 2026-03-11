import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { TIMEOUTS } from '../lib/constants';
import type { SearchResult } from '../components/features/discover/types';

export function useDiscoverSearchQuery() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSearch = useCallback(
    async (q: string, signal?: AbortSignal) => {
      if (!accessToken || !q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/social/search?q=${encodeURIComponent(q.trim())}`,
          { headers: { Authorization: `Bearer ${accessToken}` }, signal }
        );
        const data = await res.json().catch(() => ({}));
        if (signal?.aborted) return;
        if (res.ok && Array.isArray(data?.data)) setResults(data.data);
        else setResults([]);
      } catch (err: unknown) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setResults([]);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    const controller = new AbortController();
    if (ref.current) clearTimeout(ref.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return () => { if (ref.current) clearTimeout(ref.current); };
    }
    ref.current = setTimeout(() => fetchSearch(query, controller.signal), TIMEOUTS.debounce);
    return () => {
      if (ref.current) clearTimeout(ref.current);
      controller.abort();
    };
  }, [query, fetchSearch]);

  return { query, setQuery, results, setResults, loading, accessToken };
}
