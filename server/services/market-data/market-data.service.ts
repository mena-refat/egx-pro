import type { IMarketDataSource, StockQuote } from './types.ts';
import { YahooFinanceSource } from './sources/yahoo-finance-source.ts';
import { logger } from '../../lib/logger.ts';
import { getCache, setCache } from '../../lib/redis.ts';

const CACHE_KEY_PREFIX  = 'stock:quote:';
const CACHE_TTL_SECONDS = 60;        // 1 دقيقة
const STALE_TTL_SECONDS = 60 * 60;  // 1 ساعة للـ stale data
const CAIRO_TZ = 'Africa/Cairo';
const MARKET_OPEN_HOUR  = 10;       // 10 صباحاً بتوقيت القاهرة
const MARKET_CLOSE_HOUR = 15;       // 3 مساءً

/** Serialized shape for Redis (timestamp as ISO string) */
interface CachedQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  previousClose: number;
  timestamp: string;
  source: StockQuote['source'];
}

function quoteToCached(q: StockQuote): CachedQuote {
  return {
    ...q,
    timestamp: q.timestamp instanceof Date ? q.timestamp.toISOString() : String(q.timestamp),
  };
}

function cachedToQuote(c: CachedQuote): StockQuote {
  return {
    ...c,
    timestamp: new Date(c.timestamp),
  };
}

/** Cairo time: weekday and minutes since midnight using Intl (handles EET/EEST). */
function getCairoNow(): { minutesSinceMidnight: number; weekday: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TZ,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
  });
  const parts = formatter.formatToParts(new Date());
  let hour = 0, minute = 0, weekday = '';
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
    if (p.type === 'weekday') weekday = p.value;
  }
  const minutesSinceMidnight = hour * 60 + minute;
  return { minutesSinceMidnight, weekday };
}

export class MarketDataService {
  private sources: IMarketDataSource[];
  private sourceHealth = new Map<string, {
    failures:    number;
    lastSuccess: number;
    avgLatency:  number;
  }>();

  /** Called after each poll to broadcast to WebSocket clients; set from server.ts */
  private broadcastFn: ((quotes: Map<string, StockQuote>) => void) | null = null;
  private pollingActive = false;

  private symbolFailCount  = new Map<string, number>();
  private symbolSkipUntil  = new Map<string, number>();
  private readonly MAX_FAILURES_BEFORE_DEPRIORITIZE = 3;
  private readonly DEPRIORITIZE_FOR_MS = 60 * 60 * 1000;

  private shouldSkipSymbol(symbol: string): boolean {
    const skipUntil = this.symbolSkipUntil.get(symbol);
    if (skipUntil && Date.now() < skipUntil) return true;
    return false;
  }

  private recordSymbolFailure(symbol: string): void {
    const count = (this.symbolFailCount.get(symbol) ?? 0) + 1;
    this.symbolFailCount.set(symbol, count);

    if (count >= this.MAX_FAILURES_BEFORE_DEPRIORITIZE) {
      this.symbolSkipUntil.set(symbol, Date.now() + this.DEPRIORITIZE_FOR_MS);
      if (count === this.MAX_FAILURES_BEFORE_DEPRIORITIZE) {
        logger.info(`Deprioritizing ${symbol} — failed ${count} times, skipping for 1hr`);
      }
    }
  }

  private recordSymbolSuccess(symbol: string): void {
    this.symbolFailCount.delete(symbol);
    this.symbolSkipUntil.delete(symbol);
  }

  constructor() {
    this.sources = [
      new YahooFinanceSource(),
    ].sort((a, b) => a.priority - b.priority);

    this.sources.forEach(s => this.sourceHealth.set(s.name, {
      failures:    0,
      lastSuccess: Date.now(),
      avgLatency:  0,
    }));
  }

  setBroadcastFn(fn: (quotes: Map<string, StockQuote>) => void): void {
    this.broadcastFn = fn;
  }

  isMarketOpen(): boolean {
    const { minutesSinceMidnight, weekday } = getCairoNow();
    if (weekday === 'Fri' || weekday === 'Sat') return false;
    return minutesSinceMidnight >= MARKET_OPEN_HOUR * 60 && minutesSinceMidnight < MARKET_CLOSE_HOUR * 60;
  }

  async getQuote(symbol: string): Promise<StockQuote | null> {
    const quotes = await this.getQuotes([symbol]);
    return quotes.get(symbol) ?? null;
  }

  async getQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    const result = new Map<string, StockQuote>();

    const activeSymbols     = symbols.filter(s => !this.shouldSkipSymbol(s));
    const deprioritizedSyms = symbols.filter(s => this.shouldSkipSymbol(s));

    await Promise.all(
      deprioritizedSyms.map(async (symbol) => {
        const stale = await this.getFromCache(symbol, true);
        if (stale) result.set(symbol, { ...stale, source: 'CACHE' });
      })
    );

    if (activeSymbols.length === 0) return result;

    const needsFetch = new Set<string>();
    await Promise.all(
      activeSymbols.map(async (symbol) => {
        const cached = await this.getFromCache(symbol);
        if (cached) {
          result.set(symbol, cached);
        } else {
          needsFetch.add(symbol);
        }
      })
    );

    if (needsFetch.size === 0) {
      for (const symbol of activeSymbols) {
        if (result.has(symbol)) this.recordSymbolSuccess(symbol);
        else this.recordSymbolFailure(symbol);
      }
      return result;
    }

    const symbolsToFetch = Array.from(needsFetch);
    let remaining = [...symbolsToFetch];
    /** الرموز التي نجح جلبها فعلاً من أحد المصادر (ليس من الـ stale cache) */
    const fetchedFromSource = new Set<string>();

    for (const source of this.sources) {
      if (remaining.length === 0) break;

      const available = await source.isAvailable().catch(() => false);
      if (!available) {
        logger.warn(`Source ${source.name} unavailable, skipping`);
        continue;
      }

      logger.info(`Fetching ${remaining.length} symbols from ${source.name}`);

      const sourceResult = await source.fetchQuotes(remaining).catch(err => {
        logger.error(`Source ${source.name} threw`, { error: (err as Error).message });
        return null;
      });

      if (!sourceResult) continue;

      const health = this.sourceHealth.get(source.name)!;
      if (sourceResult.quotes.size > 0) {
        health.failures    = 0;
        health.lastSuccess = Date.now();
        // EWMA بمعامل تسوية 0.2 — يعطي وزناً أكبر للقيم الأحدث تدريجياً
        health.avgLatency  = health.avgLatency === 0
          ? sourceResult.latency
          : 0.8 * health.avgLatency + 0.2 * sourceResult.latency;
      } else {
        health.failures++;
      }

      for (const [symbol, quote] of sourceResult.quotes) {
        result.set(symbol, quote);
        fetchedFromSource.add(symbol);
        await this.saveToCache(symbol, quote);
      }

      remaining = sourceResult.failed.filter(s => !result.has(s));

      if (sourceResult.quotes.size > 0) {
        logger.info(`${source.name}: got ${sourceResult.quotes.size}, still need ${remaining.length}`);
      }
    }

    if (remaining.length > 0) {
      logger.warn(`All sources failed for ${remaining.length} symbols, using stale cache`);
      await Promise.all(
        remaining.map(async (symbol) => {
          const stale = await this.getFromCache(symbol, true);
          if (stale) {
            result.set(symbol, { ...stale, source: 'CACHE' });
          }
        })
      );
    }

    // نسجّل نجاح/فشل فقط للرموز التي حاولنا جلبها فعلاً من المصادر.
    // الرموز التي جاءت من stale cache بعد فشل المصادر تُعدّ فشلاً للـ deprioritization.
    for (const symbol of needsFetch) {
      if (fetchedFromSource.has(symbol)) {
        this.recordSymbolSuccess(symbol);
      } else {
        this.recordSymbolFailure(symbol);
      }
    }
    // الرموز التي وُجدت في fresh cache بالفعل — نصفّر عداد الفشل
    for (const symbol of activeSymbols) {
      if (!needsFetch.has(symbol) && result.has(symbol)) {
        this.recordSymbolSuccess(symbol);
      }
    }

    return result;
  }

  async startPolling(symbols: string[]): Promise<void> {
    const POLL_INTERVAL_MS      = 60_000;
    const OFF_HOURS_INTERVAL_MS = 5 * 60_000;

    this.pollingActive = true;

    const poll = async () => {
      if (!this.pollingActive) return;

      const interval = this.isMarketOpen()
        ? POLL_INTERVAL_MS
        : OFF_HOURS_INTERVAL_MS;

      try {
        const quotes = await this.getQuotes(symbols);

        if (this.broadcastFn && quotes.size > 0) {
          this.broadcastFn(quotes);
        }

        logger.info(`Poll complete: ${quotes.size} stocks, market ${this.isMarketOpen() ? 'OPEN' : 'CLOSED'}`);

      } catch (err: unknown) {
        logger.error('Polling error', { error: (err as Error).message });
      }

      if (this.pollingActive) {
        setTimeout(poll, interval);
      }
    };

    poll();
    logger.info('Market data polling started');
  }

  stopPolling(): void {
    this.pollingActive = false;
    logger.info('Market data polling stopped');
  }

  getHealthReport(): Record<string, unknown> {
    const report: Record<string, unknown> = {};
    this.sourceHealth.forEach((health, name) => {
      report[name] = {
        status:       health.failures < 3 ? 'healthy' : 'degraded',
        failures:     health.failures,
        lastSuccess:  new Date(health.lastSuccess).toISOString(),
        avgLatencyMs: Math.round(health.avgLatency),
      };
    });
    return report;
  }

  private async getFromCache(symbol: string, stale = false): Promise<StockQuote | null> {
    try {
      const key  = `${CACHE_KEY_PREFIX}${symbol}`;
      const data = await getCache<CachedQuote>(key);
      if (!data) return null;

      const ageSeconds = (Date.now() - new Date(data.timestamp).getTime()) / 1000;
      const maxAge     = stale ? STALE_TTL_SECONDS : CACHE_TTL_SECONDS;

      return ageSeconds <= maxAge ? cachedToQuote(data) : null;
    } catch {
      return null;
    }
  }

  private async saveToCache(symbol: string, quote: StockQuote): Promise<void> {
    try {
      const key = `${CACHE_KEY_PREFIX}${symbol}`;
      await setCache(key, quoteToCached(quote), STALE_TTL_SECONDS);
    } catch (err: unknown) {
      logger.warn('Cache save failed', { symbol, error: (err as Error).message });
    }
  }
}

export const marketDataService = new MarketDataService();
