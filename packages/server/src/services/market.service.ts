import { getMarketOverview } from '../lib/macro.ts';
import { getMarketStatus, getGoldMarketStatus } from '../lib/marketHours.ts';

const OVERVIEW_TTL_MS = 3_000;
const overviewCache = new Map<string, { expiresAt: number; value: unknown }>();
const overviewInFlight = new Map<string, Promise<unknown>>();

function overviewCacheKey(delayed: boolean): string {
  return delayed ? 'delayed' : 'realtime';
}

export const MarketService = {
  getStatus() {
    const egx = getMarketStatus();
    const gold = getGoldMarketStatus();
    return { egx, gold };
  },

  async getOverview(delayed?: boolean) {
    const delayedFlag = Boolean(delayed);
    const key = overviewCacheKey(delayedFlag);
    const now = Date.now();
    const hit = overviewCache.get(key);
    if (hit && hit.expiresAt > now) return hit.value;

    const inflight = overviewInFlight.get(key);
    if (inflight) return inflight;

    const computePromise = (async () => {
    const overview = await getMarketOverview();
    const egxStatus = getMarketStatus();
    const goldStatus = getGoldMarketStatus();
    if (!overview) {
      return {
        usdEgp: { value: 0, change: 0, changePercent: 0 },
        egx30: { value: 0, change: 0, changePercent: 0 },
        egx30Capped: { value: 0, change: 0, changePercent: 0 },
        egx70: { value: 0, change: 0, changePercent: 0 },
        egx100: { value: 0, change: 0, changePercent: 0 },
        egx33: { value: 0, change: 0, changePercent: 0 },
        egx35: { value: 0, change: 0, changePercent: 0 },
        gold: { value: 0, change: 0, changePercent: 0, valueEgxPerGram: 0, buyEgxPerGram: 0, sellEgxPerGram: 0 },
        silver: { value: 0, change: 0, changePercent: 0, valueEgxPerGram: 0, buyEgxPerGram: 0, sellEgxPerGram: 0 },
        lastUpdated: Date.now(),
        egxStatus,
        goldMarketStatus: goldStatus,
      };
    }
    const overviewObj = overview as Record<string, unknown>;
    const payload = { ...overviewObj, egxStatus, goldMarketStatus: goldStatus } as typeof overviewObj & {
      egxStatus: ReturnType<typeof getMarketStatus>;
      goldMarketStatus: ReturnType<typeof getGoldMarketStatus>;
    };
    if (delayedFlag && goldStatus.isOpen) {
      const o = overview as { gold: Record<string, unknown>; silver: Record<string, unknown> };
      (payload as Record<string, unknown>).gold = { ...o.gold, isDelayed: true };
      (payload as Record<string, unknown>).silver = { ...o.silver, isDelayed: true };
    }
    return payload;
    })();

    overviewInFlight.set(key, computePromise);
    try {
      const value = await computePromise;
      overviewCache.set(key, { value, expiresAt: now + OVERVIEW_TTL_MS });
      return value;
    } finally {
      overviewInFlight.delete(key);
    }
  },
};
