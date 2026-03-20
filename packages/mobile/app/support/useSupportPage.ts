import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../../lib/api/client';
import { useAuthStore } from '../../store/authStore';
import type { SupportTicket } from './supportTypes';

export function useSupportPage() {
  const user = useAuthStore((s) => s.user);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const plan = user?.plan ?? 'free';
  const referralProExpiresAt = (user as { referralProExpiresAt?: string | null } | null)?.referralProExpiresAt;
  const canUseSupport =
    plan !== 'free' || (!!referralProExpiresAt && new Date(referralProExpiresAt) > new Date());

  useEffect(() => {
    if (!canUseSupport) {
      setShowCreate(false);
      setSelected(null);
    }
  }, [canUseSupport]);

  const load = useCallback(
    async (signal?: AbortSignal, opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (!silent) setLoading(true);
      setLoadError(null);

      try {
        const res = await apiClient.get('/api/support/my', { signal });
        const data = res.data as { tickets?: SupportTicket[] } | SupportTicket[];
        const list = Array.isArray(data) ? data : (data as { tickets?: SupportTicket[] }).tickets ?? [];

        if (!signal?.aborted && mountedRef.current) {
          setTickets(list);
        }
      } catch {
        if (!signal?.aborted && mountedRef.current) {
          setLoadError('تعذّر تحميل تذاكر الدعم، حاول مرة أخرى');
        }
      } finally {
        if (!signal?.aborted && mountedRef.current) {
          if (!silent) setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const ctrl = new AbortController();
    try {
      await load(ctrl.signal, { silent: true });
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, [load]);

  const handleCreated = useCallback(() => {
    setShowCreate(false);
    void load(undefined, { silent: true });
  }, [load]);

  const markReplyRead = useCallback((ticketId: string) => {
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, replyRead: true } : t)));
    setSelected((prev) => (prev && prev.id === ticketId ? { ...prev, replyRead: true } : prev));
  }, []);

  const rateTicket = useCallback(
    (ticketId: string, stars: number) => {
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, rating: stars } : t)));
      setSelected((prev) => (prev && prev.id === ticketId ? { ...prev, rating: stars } : prev));
      void load(undefined, { silent: true });
    },
    [load],
  );

  return {
    user,
    canUseSupport,
    tickets,
    loading,
    refreshing,
    showCreate,
    setShowCreate,
    selected,
    setSelected,
    loadError,
    refresh,
    handleCreated,
    markReplyRead,
    rateTicket,
  };
}

