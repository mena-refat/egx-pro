/**
 * Debounced search with AbortController — cancels previous request when query changes.
 * Use for stock search, discover/username search. Returns { query, setQuery, results, isSearching }.
 */
import { useState, useCallback, useRef, useEffect } from 'react';

export function useDebouncedSearch<T>(
  searchFn: (query: string, signal: AbortSignal) => Promise<T>,
  delay = 300,
  minLength = 2
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const searchFnRef = useRef(searchFn);

  useEffect(() => {
    searchFnRef.current = searchFn;
  }, [searchFn]);

  useEffect(() => {
    const run = query.trim();
    if (run.length < minLength) {
      setResults(null);
      setIsSearching(false);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setIsSearching(true);
      searchFnRef.current(run, ac.signal)
        .then((data) => {
          if (!ac.signal.aborted) setResults(data);
        })
        .catch((err) => {
          if (import.meta.env.DEV) console.error('Debounced search failed:', err);
          if (!ac.signal.aborted) setResults(null);
        })
        .finally(() => {
          if (!ac.signal.aborted) setIsSearching(false);
        });
      timerRef.current = null;
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query, delay, minLength]);

  return { query, setQuery, results, isSearching };
}

export interface UseDebouncedSearchOptions {
  delayMs?: number;
  minLength?: number;
  initialValue?: string;
}

/** Low-level: debounced value + getSignal for manual fetch. */
export function useDebouncedSearchValue(options: UseDebouncedSearchOptions = {}) {
  const { delayMs = 300, minLength = 0, initialValue = '' } = options;
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const triggerCancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const next = value.trim();
      if (minLength === 0 || next.length >= minLength || next.length === 0) {
        setDebouncedValue(next);
      }
      timerRef.current = null;
    }, delayMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delayMs, minLength]);

  const getSignal = useCallback(() => {
    triggerCancel();
    const ac = new AbortController();
    abortRef.current = ac;
    return ac.signal;
  }, [triggerCancel]);

  return {
    value,
    debouncedValue,
    setSearch: useCallback((v: string) => setValue(v), []),
    getSignal,
    cancel: triggerCancel,
    isReady: minLength === 0 ? true : value.trim().length >= minLength,
  };
}
