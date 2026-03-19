/**
 * سياق السوق الحالي — USD/EGP، حالة السوق. EGX30 يبحث عنه Claude — لا نستدعيه (غير متوفر في ticker list).
 */
import { getCache, setCache } from './redis.ts';
import { getMarketStatus } from './marketHours.ts';

export interface MarketContext {
  egx30: { price: number; changePercent: number } | null;
  usdEgp: number | null;
  marketStatus: string;
  /** آخر تحديث (ISO string) */
  timestamp: string;
}

export async function getMarketContext(): Promise<MarketContext> {
  const cached = await getCache<MarketContext>('analysis:market_context');
  if (cached) return cached;

  let usdEgp: number | null = null;

  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = (await res.json()) as { rates?: { EGP?: number } };
      usdEgp = data.rates?.EGP ?? null;
    }
  } catch {
    // fallback — Claude will search
  }

  const status = getMarketStatus();

  const ctx: MarketContext = {
    egx30: null, // Claude يبحث عنه — مش عندنا index data حقيقي
    usdEgp,
    marketStatus: status.label.ar,
    timestamp: new Date().toISOString(),
  };

  await setCache('analysis:market_context', ctx, 600).catch(() => {});
  return ctx;
}
