import { useState, useCallback, useEffect } from 'react';
import api from '../lib/api';
import { getAccessToken } from '../lib/auth/tokens';

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  route?: string | null;
  isRead: boolean;
  createdAt: string;
};

export function useNotifications(isAuthenticated: boolean) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const fetchNotifications = useCallback(async (signal?: AbortSignal) => {
    const token = getAccessToken();
    if (!token) return;
    setNotificationsLoading(true);
    try {
      const res = await api.get('/notifications', { signal });
      if (signal?.aborted) return;
      const data = res.data;
      const payload = (data as { data?: { notifications?: NotificationItem[]; unreadCount?: number } }).data ?? data;
      if (payload?.notifications) {
        setNotifications(payload.notifications);
        setUnreadCount(payload.unreadCount ?? 0);
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return;
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    fetchNotifications(controller.signal);
    const interval = setInterval(() => {
      if (!document.hidden) fetchNotifications();
    }, 30000);
    const onReplyRead = () => fetchNotifications();
    window.addEventListener('support:reply-read', onReplyRead);
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener('support:reply-read', onReplyRead); };
  }, [isAuthenticated, fetchNotifications]);

  const markAllRead = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  }, []);

  const markOneRead = useCallback(async (id: string) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }, []);

  const clearAll = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api.delete('/notifications/clear-all');
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }, []);

  return {
    notifications,
    unreadCount,
    notificationsLoading,
    fetchNotifications,
    markAllRead,
    markOneRead,
    clearAll,
  };
}
