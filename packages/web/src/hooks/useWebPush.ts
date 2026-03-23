import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Status = 'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported';

export function useWebPush() {
  const supported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;

  const [status, setStatus] = useState<Status>(supported ? 'idle' : 'unsupported');
  const [error, setError] = useState<string | null>(null);

  // Check current state on mount
  useEffect(() => {
    if (!supported) return;
    if (Notification.permission === 'denied') { setStatus('denied'); return; }

    navigator.serviceWorker.getRegistration('/').then((reg) => {
      if (!reg) return;
      return reg.pushManager.getSubscription();
    }).then((sub) => {
      if (sub) setStatus('subscribed');
    }).catch(() => {});
  }, [supported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    setStatus('loading');
    setError(null);
    try {
      // 1. Get VAPID public key
      const { data } = await api.get<{ publicKey: string }>('/notifications/push/vapid-key');
      const vapidKey = data.publicKey;
      if (!vapidKey) {
        setStatus('idle');
        setError('Push notifications not configured on server.');
        return false;
      }

      // 2. Request permission
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setStatus(perm === 'denied' ? 'denied' : 'idle');
        return false;
      }

      // 3. Register service worker, then wait for it to become active
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const reg = await navigator.serviceWorker.ready;

      // 4. Clear any stale subscription (different VAPID key causes "push service error")
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) await existingSub.unsubscribe();

      // 5. Subscribe to push using the active registration
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // 6. Send to backend
      const json = sub.toJSON();
      await api.post('/notifications/push/subscribe', {
        endpoint: json.endpoint,
        p256dh:   json.keys?.p256dh,
        auth:     json.keys?.auth,
      });

      setStatus('subscribed');
      return true;
    } catch (err) {
      console.error('[useWebPush] subscribe failed:', err);
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Failed to enable push notifications.');
      return false;
    }
  }, [supported]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!supported) return;
    setStatus('loading');
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await api.delete('/notifications/push/unsubscribe', { data: { endpoint: sub.endpoint } });
          await sub.unsubscribe();
        }
      }
      setStatus('idle');
    } catch (err) {
      console.error('[useWebPush] unsubscribe failed:', err);
      setStatus('idle');
    }
  }, [supported]);

  return {
    supported,
    status,
    error,
    isSubscribed: status === 'subscribed',
    isDenied:     status === 'denied',
    isLoading:    status === 'loading',
    subscribe,
    unsubscribe,
  };
}
