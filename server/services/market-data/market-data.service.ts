import type { IMarketDataSource, StockQuote } from './types.ts';
import { YahooFinanceSource } from './sources/yahoo-finance-source.ts';
import { logger } from '../../lib/logger.ts';
import { getCache, setCache } from '../../lib/redis.ts';
import { MARKET_DATA } from '../../lib/constants.ts';

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

/**
 * How many ms until the next market open (Cairo time).
 * Returns 0 if market is currently open.
 * Accounts for weekends: if today is Thu after close, next open is Sunday.
 */
function msUntilMarketOpen(): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MARKET_DATA.CAIRO_TZ,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    weekday: 'short',
  });
  const parts = formatter.formatToParts(now);
  let hour = 0, minute = 0, second = 0, weekday = '';
  for (const p of parts) {
    if (p.type === 'hour')    hour    = parseInt(p.value, 10);
    if (p.type === 'minute')  minute  = parseInt(p.value, 10);
    if (p.type === 'second')  second  = parseInt(p.value, 10);
    if (p.type === 'weekday') weekday = p.value;
  }

  const minutesSinceMidnight = hour * 60 + minute;
  const openMinute  = MARKET_DATA.MARKET_OPEN_HOUR  * 60;
  const closeMinute = MARKET_DATA.MARKET_CLOSE_HOUR * 60;

  // Market is open right now
  if (weekday !== 'Fri' && weekday !== 'Sat' &&
      minutesSinceMidnight >= openMinute && minutesSinceMidnight < closeMinute) {
    return 0;
  }

  // Calculate seconds until today's open, accounting for weekend
  const daysUntilOpen: Record<string, number> = {
    Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 2, Sat: 1,
  };
  let daysAhead = daysUntilOpen[weekday] ?? 0;

  // If today is a weekday but we're past close, open is tomorrow (or Monday if Thu)
  if (daysAhead === 0 && minutesSinceMidnight >= closeMinute) {
    daysAhead = weekday === 'Thu' ? 3 : 1; // Thu → skip Fri+Sat → Sun
  }
  // If today is a weekday but before open, open is later today
  if (daysAhead === 0 && minutesSinceMidnight < openMinute) {
    const secsUntilOpen = (openMinute - minutesSinceMidnight) * 60 - second;
    return secsUntilOpen * 1000;
  }

  // Days ahead: calculate ms to midnight of that day + open time
  const secsToMidnight = (24 * 60 - minutesSinceMidnight) * 60 - second;
  const secsFromMidnightToOpen = openMinute * 60;
  return (secsToMidnight + (daysAhead - 1) * 24 * 3600 + secsFromMidnightToOpen) * 1000;
}

/** Cairo time: weekday and minutes since midnight using Intl (handles EET/EEST). */
function getCairoNow(): { minutesSinceMidnight: number; weekday: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MARKET_DATA.CAIRO_TZ,
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

  /** In-memory fallback cache used when Redis is unavailable */
  private memCache = new Map<string, { quote: StockQuote; savedAt: number }>();
  /** Limit mem cache to avoid unbounded growth (~500 EGX stocks max) */
  private readonly MEM_CACHE_MAX_SIZE = 600;

  private symbolFailCount  = new Map<string, number>();
  private symbolSkipUntil  = new Map<string, number>();
  private readonly MAX_FAILURES_BEFORE_DEPRIORITIZE = MARKET_DATA.MAX_FAILURES_BEFORE_DEPRIORITIZE;
  private readonly DEPRIORITIZE_FOR_MS = MARKET_DATA.DEPRIORITIZE_FOR_MS;

  private shouldSkipSymbol(symbol: string): boolean {
    const skipUntil = this.symbolSkipUntil.get(symbol);
    if (!skipUntil) return false;
    if (Date.now() >= skipUntil) {
      // Clean up expired deprioritization entries
      this.symbolSkipUntil.delete(symbol);
      this.symbolFailCount.delete(symbol);
      return false;
    }
    return true;
  }

  private recordSymbolFailure(symbol: string): void {
    const count = (this.symbolFailCount.get(symbol) ?? 0) + 1;
    this.symbolFailCount.set(symbol, count);

    if (count >= MARKET_DATA.MAX_FAILURES_BEFORE_DEPRIORITIZE) {
      this.symbolSkipUntil.set(symbol, Date.now() + MARKET_DATA.DEPRIORITIZE_FOR_MS);
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
      new YahooFinanceSource(), // chart endpoint — accurate EGX daily close prices
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

  /**
   * Return quotes directly from cache (in-memory or Redis) without hitting any source.
   * Used by the bulk-prices HTTP endpoint so it never blocks on Yahoo Finance calls.
   * Returns only symbols that have a cached entry with price > 0.
   */
  async getCachedQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    const result = new Map<string, StockQuote>();
    await Promise.all(
      symbols.map(async (symbol) => {
        const cached = await this.getFromCache(symbol, true); // accept stale
        if (cached && cached.price > 0) result.set(symbol, cached);
      })
    );
    return result;
  }

  isMarketOpen(): boolean {
    const { minutesSinceMidnight, weekday } = getCairoNow();
    if (weekday === 'Fri' || weekday === 'Sat') return false;
    return minutesSinceMidnight >= MARKET_DATA.MARKET_OPEN_HOUR * 60 && minutesSinceMidnight < MARKET_DATA.MARKET_CLOSE_HOUR * 60;
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

      const health = this.sourceHealth.get(source.name);
      if (!health) continue;
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
    this.pollingActive = true;

    /** Consecutive poll failures — used for auto-backoff to avoid Yahoo IP bans */
    let consecutiveFailures = 0;

    const poll = async () => {
      if (!this.pollingActive) return;

      const marketOpen = this.isMarketOpen();
      const msToOpen   = msUntilMarketOpen();

      // Outside hours: wake up exactly when market opens (if sooner than OFF_HOURS_INTERVAL)
      // so the first poll of the day fires at 10:00 Cairo, not up to 2h late.
      const baseInterval = marketOpen
        ? MARKET_DATA.POLL_INTERVAL_MS
        : (msToOpen > 0 && msToOpen < MARKET_DATA.OFF_HOURS_INTERVAL_MS)
            ? msToOpen
            : MARKET_DATA.OFF_HOURS_INTERVAL_MS;

      // Auto-backoff: double the interval for each consecutive failure, cap at 5 min
      const interval = consecutiveFailures === 0
        ? baseInterval
        : Math.min(baseInterval * Math.pow(2, consecutiveFailures), 5 * 60_000);

      try {
        const quotes = await this.getQuotes(symbols);

        if (this.broadcastFn && quotes.size > 0) {
          this.broadcastFn(quotes);
        }

        // Reset backoff on successful poll
        if (quotes.size > 0) consecutiveFailures = 0;

        logger.info(`Poll complete: ${quotes.size} stocks, market ${this.isMarketOpen() ? 'OPEN' : 'CLOSED'}`, {
          nextPollMs: interval,
        });

      } catch (err: unknown) {
        consecutiveFailures++;
        logger.error('Polling error', {
          error: (err as Error).message,
          backoffMs: interval,
          consecutiveFailures,
        });
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
        status:       health.failures < MARKET_DATA.MAX_FAILURES_BEFORE_DEPRIORITIZE ? 'healthy' : 'degraded',
        failures:     health.failures,
        lastSuccess:  new Date(health.lastSuccess).toISOString(),
        avgLatencyMs: Math.round(health.avgLatency),
      };
    });
    return report;
  }

  private async getFromCache(symbol: string, stale = false): Promise<StockQuote | null> {
    try {
      const key  = `${MARKET_DATA.CACHE_KEY_PREFIX}${symbol}`;
      const data = await getCache<CachedQuote>(key);
      if (data) {
        const ageSeconds = (Date.now() - new Date(data.timestamp).getTime()) / 1000;
        const maxAge     = stale ? MARKET_DATA.STALE_TTL_SECONDS : MARKET_DATA.CACHE_TTL_SECONDS;
        if (ageSeconds <= maxAge) return cachedToQuote(data);
      }
    } catch {
      // fall through to in-memory cache
    }

    const mem = this.memCache.get(symbol);
    if (mem) {
      const ageSeconds = (Date.now() - mem.savedAt) / 1000;
      const maxAge     = stale ? MARKET_DATA.STALE_TTL_SECONDS : MARKET_DATA.CACHE_TTL_SECONDS;
      if (ageSeconds <= maxAge) return mem.quote;
    }
    return null;
  }

  private async saveToCache(symbol: string, quote: StockQuote): Promise<void> {
    // Evict the oldest entry when at capacity (simple FIFO)
    if (!this.memCache.has(symbol) && this.memCache.size >= this.MEM_CACHE_MAX_SIZE) {
      const firstKey = this.memCache.keys().next().value;
      if (firstKey !== undefined) this.memCache.delete(firstKey);
    }
    this.memCache.set(symbol, { quote, savedAt: Date.now() });

    try {
      const key = `${MARKET_DATA.CACHE_KEY_PREFIX}${symbol}`;
      await setCache(key, quoteToCached(quote), MARKET_DATA.STALE_TTL_SECONDS);
    } catch (err: unknown) {
      logger.warn('Cache save failed', { symbol, error: (err as Error).message });
    }
  }
}

export const marketDataService = new MarketDataService();
