/** سياق السوق الحالي — USD/EGP + EGX30 (حقيقي) + حالة السوق. */
import { getCache, setCache } from './redis.ts';
import { getMarketStatus } from './marketHours.ts';

export interface MarketContext {
  egx30: { price: number; changePercent: number } | null;
  usdEgp: number | null;
  marketStatus: string;
  /** آخر تحديث (ISO string) */
  timestamp: string;
}

async function fetchUsdEgp(): Promise<number | null> {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: { EGP?: number } };
    const v = data.rates?.EGP;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

async function fetchEgx30(): Promise<{ price: number; changePercent: number } | null> {
  try {
    const YahooFinance = (await import('yahoo-finance2')).default;
    const yahoo = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    // ^CASE30 is the EGX30 index on Yahoo Finance
    const quote = await (yahoo.quote as (s: string, q?: object, o?: object) => Promise<unknown>)(
      '^CASE30', {}, { validateResult: false },
    );
    const q = quote as { regularMarketPrice?: number; regularMarketChangePercent?: number } | null;
    const price = Number(q?.regularMarketPrice);
    const chg = Number(q?.regularMarketChangePercent);
    if (Number.isFinite(price) && price > 0) {
      return {
        price: Math.round(price * 100) / 100,
        changePercent: Math.round((Number.isFinite(chg) ? chg : 0) * 100) / 100,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getMarketContext(): Promise<MarketContext> {
  const cached = await getCache<MarketContext>('analysis:market_context');
  if (cached) return cached;

  // Fetch USD/EGP and EGX30 in parallel — both have 5s timeout
  const [usdEgp, egx30] = await Promise.all([fetchUsdEgp(), fetchEgx30()]);

  const status = getMarketStatus();

  const ctx: MarketContext = {
    egx30,
    usdEgp,
    marketStatus: status.label.ar,
    timestamp: new Date().toISOString(),
  };

  await setCache('analysis:market_context', ctx, 600).catch(() => {});
  return ctx;
}
