import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DISCOVER, TIMEOUTS } from '../lib/constants';
import type { AutocompleteSuggestion } from '../components/features/discover/types';

export function useDiscoverAutocomplete(
  query: string,
  setQuery: (q: string) => void,
  accessToken: string | null
) {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchAutocomplete = useCallback(
    async (q: string, signal?: AbortSignal) => {
      if (!accessToken || q.trim().length < DISCOVER.minUsernameLength) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      setOpen(true);
      setHighlightedIndex(-1);
      try {
        const res = await fetch(
          `/api/social/username-search?q=${encodeURIComponent(q.trim())}&limit=${DISCOVER.autocompleteLimit}`,
          { headers: { Authorization: `Bearer ${accessToken}` }, signal }
        );
        const data = await res.json().catch(() => []);
        if (signal?.aborted) return;
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setSuggestions([]);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    const controller = new AbortController();
    if (ref.current) clearTimeout(ref.current);
    if (query.trim().length < DISCOVER.minUsernameLength) {
      setSuggestions([]);
      setOpen(false);
      return () => { if (ref.current) clearTimeout(ref.current); };
    }
    ref.current = setTimeout(() => fetchAutocomplete(query, controller.signal), TIMEOUTS.debounce);
    return () => {
      if (ref.current) clearTimeout(ref.current);
      controller.abort();
    };
  }, [query, fetchAutocomplete]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!open || !inputRef.current?.contains(target) && !dropdownRef.current?.contains(target))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && suggestions.length > 0)
      setHighlightedIndex((i) => (i >= suggestions.length ? suggestions.length - 1 : i));
  }, [open, suggestions.length]);

  const handleSelect = useCallback((username: string) => {
    setOpen(false);
    setSuggestions([]);
    setQuery('');
    navigate(`/profile/${username}`);
  }, [navigate, setQuery]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i < suggestions.length - 1 ? i + 1 : i));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : -1));
      return;
    }
    if (e.key === 'Enter' && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex].username);
    }
  }, [open, highlightedIndex, suggestions, handleSelect]);

  const showDropdown = open && query.trim().length >= DISCOVER.minUsernameLength;

  return {
    suggestions,
    loading,
    open: showDropdown,
    setOpen,
    highlightedIndex,
    inputRef,
    dropdownRef,
    handleSelect,
    handleKeyDown,
  };
}
