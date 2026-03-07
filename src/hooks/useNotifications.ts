import { useState, useCallback, useEffect } from 'react';
import { getAccessToken } from '../lib/auth/tokens';

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export function useNotifications(isAuthenticated: boolean) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data?.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchNotifications();
  }, [isAuthenticated, fetchNotifications]);

  const markAllRead = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
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
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
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
      await fetch('/api/notifications/clear-all', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }, []);

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markAllRead,
    markOneRead,
    clearAll,
  };
}
