import { useEffect, useRef } from 'react';
import api from '../lib/api';

interface WatchlistItem {
  ticker: string;
  targetPrice?: number | null;
}

interface LivePrice {
  price: number;
}

type LivePricesMap = Record<string, LivePrice>;

export function useWatchlistTargets(watchlist: WatchlistItem[], livePrices: LivePricesMap) {
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  useEffect(() => {
    if (!watchlist.length) return;

    const items = watchlist
      .filter(
        (w) => w.targetPrice != null && typeof w.targetPrice === 'number'
      )
      .map((w) => ({
        ticker: w.ticker,
        targetPrice: w.targetPrice as number,
        currentPrice: livePrices[w.ticker]?.price ?? 0,
      }))
      .filter((item) => item.currentPrice >= item.targetPrice);

    if (items.length === 0) return;

    const controller = new AbortController();

    void api
      .post(
        '/watchlist/check-targets',
        { items },
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

