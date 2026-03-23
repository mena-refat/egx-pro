import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import apiClient from '../lib/api/client';

const isExpoGo =
  Constants.executionEnvironment === 'storeClient' ||
  Constants.appOwnership === 'expo';

interface WatchlistItem {
  ticker: string;
  targetPrice?: number | null;
  targetDirection?: 'UP' | 'DOWN' | null;
}

interface LivePrice {
  price: number;
}

type LivePricesMap = Record<string, LivePrice>;

async function fireLocalNotification(ticker: string, currentPrice: number, targetPrice: number, direction: 'UP' | 'DOWN') {
  if (isExpoGo) return;
  try {
    const Notifications = (await import('expo-notifications')).default ?? await import('expo-notifications');
    const dirSymbol = direction === 'DOWN' ? '↓' : '↑';
    await (Notifications as typeof import('expo-notifications')).scheduleNotificationAsync({
      content: {
        title: `${ticker} وصل للسعر المستهدف ${dirSymbol}`,
        body: `السعر الحالي ${currentPrice.toFixed(2)} ج.م — وصل للهدف ${targetPrice.toFixed(2)} ج.م`,
        data: { route: `/stocks/${ticker}` },
        sound: 'default',
      },
      trigger: null, // fire immediately
    });
  } catch {
    // non-critical
  }
}

/**
 * Monitors live prices against watchlist target prices.
 * When a target is hit:
 *  1. Fires an immediate local push notification (mobile only)
 *  2. Calls POST /api/watchlist/check-targets so the server creates
 *     a persisted in-app notification + sends an Expo push if needed.
 *
 * Deduplicates per session via notifiedRef so the same target only
 * fires once until the app restarts or the target changes.
 */
export function useWatchlistTargets(watchlist: WatchlistItem[], livePrices: LivePricesMap) {
  const notifiedRef = useRef<Set<string>>(new Set());
  const mountedRef  = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  // Clear dedup cache when app comes back to foreground — prices may have
  // moved past and then back through the target while backgrounded.
  useEffect(() => {
    const handler = (state: AppStateStatus) => {
      if (state === 'active') notifiedRef.current.clear();
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!watchlist.length) return;

    // Find watchlist items whose target has been hit by the current live price
    const hitItems = watchlist
      .filter((w) => w.targetPrice != null && typeof w.targetPrice === 'number')
      .map((w) => {
        const direction: 'UP' | 'DOWN' = w.targetDirection === 'DOWN' ? 'DOWN' : 'UP';
        const currentPrice = livePrices[w.ticker]?.price ?? 0;
        const tp = w.targetPrice as number;
        const hit = direction === 'DOWN' ? currentPrice <= tp : currentPrice >= tp;
        return { ticker: w.ticker, targetPrice: tp, targetDirection: direction, currentPrice, hit };
      })
      .filter((item) => item.hit && item.currentPrice > 0);

    if (hitItems.length === 0) return;

    const controller = new AbortController();

    for (const item of hitItems) {
      const key = `${item.ticker}:${item.targetPrice}:${item.targetDirection}`;
      if (!notifiedRef.current.has(key)) {
        notifiedRef.current.add(key);
        void fireLocalNotification(item.ticker, item.currentPrice, item.targetPrice, item.targetDirection);
      }
    }

    // Notify server to create persisted notification + send Expo push
    void apiClient
      .post(
        '/api/watchlist/check-targets',
        {
          items: hitItems.map(({ ticker, targetPrice, targetDirection, currentPrice }) => ({
            ticker, targetPrice, targetDirection, currentPrice,
          })),
        },
        { signal: controller.signal },
      )
      .catch(() => {
        // non-critical — ignore network errors
      });

    return () => controller.abort();
  }, [watchlist, livePrices]);
}
