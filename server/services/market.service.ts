import { getMarketOverview } from '../lib/macro.ts';
import { getMarketStatus, getGoldMarketStatus } from '../lib/marketHours.ts';

export const MarketService = {
  getStatus() {
    const egx = getMarketStatus();
    const gold = getGoldMarketStatus();
    return { egx, gold };
  },

  async getOverview(delayed?: boolean) {
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
    const payload = { ...overview, egxStatus, goldMarketStatus: goldStatus } as typeof overview & {
      egxStatus: ReturnType<typeof getMarketStatus>;
      goldMarketStatus: ReturnType<typeof getGoldMarketStatus>;
    };
    if (delayed && goldStatus.isOpen) {
      (payload as Record<string, unknown>).gold = { ...overview.gold, isDelayed: true };
      (payload as Record<string, unknown>).silver = { ...overview.silver, isDelayed: true };
    }
    return payload;
  },
};
