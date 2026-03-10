import type { IMarketDataSource, StockQuote } from './types.ts';
import { EgxScraperSource } from './sources/egx-scraper.ts';
import { YahooFinanceSource } from './sources/yahoo-source.ts';
import { EgxlyticsSource } from './sources/egxlytics-source.ts';
import { logger } from '../../lib/logger.ts';
import { getCache, setCache } from '../../lib/redis.ts';
import { EGX_TICKERS } from '../../lib/egxTickers.ts';

const CACHE_KEY_PREFIX  = 'stock:quote:';
const CACHE_TTL_SECONDS = 60;        // 1 دقيقة
const STALE_TTL_SECONDS = 60 * 60;  // 1 ساعة للـ stale data
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

export class MarketDataService {
  private sources: IMarketDataSource[];
  private sourceHealth = new Map<string, {
    failures:    number;
    lastSuccess: number;
    avgLatency:  number;
  }>();

  /** Called after each poll to broadcast to WebSocket clients; set from server.ts */
  private broadcastFn: ((quotes: Map<string, StockQuote>) => void) | null = null;

  constructor() {
    this.sources = [
      new EgxlyticsSource(),
      new EgxScraperSource(),
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
    const now = new Date();
    const cairoOffset = 2;
    const cairoHour = (now.getUTCHours() + cairoOffset) % 24;
    const day = now.getUTCDay();

    const isWeekday = day >= 0 && day <= 4;
    const isInHours = cairoHour >= MARKET_OPEN_HOUR && cairoHour < MARKET_CLOSE_HOUR;

    return isWeekday && isInHours;
  }

  async getQuote(symbol: string): Promise<StockQuote | null> {
    const quotes = await this.getQuotes([symbol]);
    return quotes.get(symbol) ?? null;
  }

  async getQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    const result     = new Map<string, StockQuote>();
    const needsFetch = new Set<string>();

    await Promise.all(
      symbols.map(async (symbol) => {
        const cached = await this.getFromCache(symbol);
        if (cached) {
          result.set(symbol, cached);
        } else {
          needsFetch.add(symbol);
        }
      })
    );

    if (needsFetch.size === 0) return result;

    const symbolsToFetch = Array.from(needsFetch);
    let remaining = [...symbolsToFetch];

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
        health.avgLatency  = (health.avgLatency + sourceResult.latency) / 2;
      } else {
        health.failures++;
      }

      for (const [symbol, quote] of sourceResult.quotes) {
        result.set(symbol, quote);
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

    return result;
  }

  async startPolling(symbols: string[]): Promise<void> {
    const POLL_INTERVAL_MS      = 60_000;
    const OFF_HOURS_INTERVAL_MS = 5 * 60_000;

    const poll = async () => {
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

      setTimeout(poll, interval);
    };

    poll();
    logger.info('Market data polling started');
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
