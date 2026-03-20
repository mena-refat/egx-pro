import { useEffect, useRef } from 'react';
import api from '../lib/api';

interface WatchlistItem {
  ticker: string;
  targetPrice?: number | null;
  targetDirection?: 'UP' | 'DOWN' | null;
}

interface LivePrice {
  price: number;
}

type LivePricesMap = Record<string, LivePrice>;

async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function fireBrowserNotification(ticker: string, currentPrice: number, targetPrice: number, direction: 'UP' | 'DOWN') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const dirSymbol = direction === 'DOWN' ? '↓' : '↑';
  const title = `${ticker} وصل للسعر المستهدف ${dirSymbol}`;
  const body = `السعر الحالي ${currentPrice.toFixed(2)} ج.م — وصل للهدف ${targetPrice.toFixed(2)} ج.م`;
  try {
    new Notification(title, { body, icon: '/logo192.png' });
  } catch {
    // Some browsers block Notification constructor outside of service worker context
  }
}

export function useWatchlistTargets(watchlist: WatchlistItem[], livePrices: LivePricesMap) {
  const mountedRef = useRef(true);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  // Request permission once when there are watchlist items with targets
  useEffect(() => {
    if (watchlist.some((w) => w.targetPrice != null)) {
      void requestNotificationPermission();
    }
  }, [watchlist]);

  useEffect(() => {
    if (!watchlist.length) return;

    const items = watchlist
      .filter((w) => w.targetPrice != null && typeof w.targetPrice === 'number')
      .map((w) => {
        const direction: 'UP' | 'DOWN' = w.targetDirection === 'DOWN' ? 'DOWN' : 'UP';
        const currentPrice = livePrices[w.ticker]?.price ?? 0;
        const targetPrice = w.targetPrice as number;
        const hit = direction === 'DOWN' ? currentPrice <= targetPrice : currentPrice >= targetPrice;
        return { ticker: w.ticker, targetPrice, targetDirection: direction, currentPrice, hit };
      })
      .filter((item) => item.hit && item.currentPrice > 0);

    if (items.length === 0) return;

    // Fire browser notifications for newly hit targets
    for (const item of items) {
      const key = `${item.ticker}:${item.targetPrice}:${item.targetDirection}`;
      if (!notifiedRef.current.has(key)) {
        notifiedRef.current.add(key);
        fireBrowserNotification(item.ticker, item.currentPrice, item.targetPrice, item.targetDirection);
      }
    }

    const controller = new AbortController();

    void api
      .post(
        '/watchlist/check-targets',
        { items: items.map(({ ticker, targetPrice, targetDirection, currentPrice }) => ({ ticker, targetPrice, targetDirection, currentPrice })) },
        { signal: controller.signal }
      )
      .catch((err) => {
        if (
          err instanceof Error &&
          (err.name === 'AbortError' ||
            (err as { code?: string }).code === 'ERR_CANCELED')
        ) {
          return;
        }
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error('check-targets failed:', err);
        }
      });

    return () => {
      controller.abort();
    };
  }, [watchlist, livePrices]);
}
