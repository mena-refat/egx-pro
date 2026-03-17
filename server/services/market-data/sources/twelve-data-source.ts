import axios, { AxiosInstance } from 'axios';
import type { IMarketDataSource, DataSourceResult, StockQuote } from '../types.ts';
import { logger } from '../../../lib/logger.ts';
import { withRetry } from '../../../lib/retry.ts';

type TwelveDataQuote = {
  symbol: string;
  name?: string;
  currency?: string;
  price: string;
  open?: string;
  high?: string;
  low?: string;
  previous_close?: string;
  volume?: string;
  datetime?: string;
};

type TwelveDataResponse =
  | { data: TwelveDataQuote[]; status?: string }
  | { code?: string; message?: string; status?: string };

/**
 * Twelve Data source:
 * - Primary live price source
 * - Batch symbols in a single comma-separated request
 * - Fallback handled by MarketDataService (next sources)
 */
export class TwelveDataSource implements IMarketDataSource {
  name = 'TWELVE';
  // Higher priority than Yahoo/Stooq (lower number = higher priority)
  priority = 0;

  private http: AxiosInstance;
  private readonly BATCH_SIZE = 120;

  constructor() {
    this.http = axios.create({
      baseURL: 'https://api.twelvedata.com',
      timeout: 10_000,
    });
  }

  private hasApiKey(): boolean {
    return Boolean(process.env.TWELVE_DATA_API_KEY);
  }

  async isAvailable(): Promise<boolean> {
    if (!this.hasApiKey()) {
      logger.warn('TwelveDataSource: TWELVE_DATA_API_KEY not configured, marking unavailable');
      return false;
    }

    // Lightweight availability probe on a single symbol
    const probeSymbol = 'COMI.CA';
    try {
      const mapped = this.toTwelveSymbol(probeSymbol);
      const res = await this.http.get<TwelveDataResponse>('/quote', {
        params: {
          symbol: mapped,
          apikey: process.env.TWELVE_DATA_API_KEY,
        },
      });

      if ('data' in res.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return true;
      }

      logger.warn('TwelveDataSource: availability probe returned unexpected shape', {
        body: res.data,
      });
      return false;
    } catch (err) {
      logger.error('TwelveDataSource: availability probe failed', {
        error: (err as Error).message,
      });
      return false;
    }
  }

  async fetchQuotes(symbols: string[]): Promise<DataSourceResult> {
    const start = Date.now();
    const quotes = new Map<string, StockQuote>();
    const failed: string[] = [];

    if (!this.hasApiKey()) {
      logger.warn('TwelveDataSource: no API key, skipping fetch');
      return {
        quotes,
        failed: [...symbols],
        source: this.name,
        latency: 0,
      };
    }

    // Twelve Data expects e.g. "COMI:XCAI" not "COMI.CA"
    const mappedSymbols = symbols.map((s) => ({ egx: s, twelve: this.toTwelveSymbol(s) }));

    // Minimize API calls: one batch of up to BATCH_SIZE symbols per request
    const batches: { egx: string; twelve: string }[][] = [];
    for (let i = 0; i < mappedSymbols.length; i += this.BATCH_SIZE) {
      batches.push(mappedSymbols.slice(i, i + this.BATCH_SIZE));
    }

    for (const batch of batches) {
      const twelveSymbols = batch.map((s) => s.twelve).join(',');

      try {
        const res = await withRetry(
          () =>
            this.http.get<TwelveDataResponse>('/quote', {
              params: {
                symbol: twelveSymbols,
                apikey: process.env.TWELVE_DATA_API_KEY,
              },
            }),
          { maxAttempts: 2, baseDelayMs: 500 }
        );

        const body = res.data;

        if (!('data' in body) || !Array.isArray(body.data)) {
          logger.warn('TwelveDataSource: unexpected response shape', { body });
          batch.forEach((s) => failed.push(s.egx));
          continue;
        }

        const now = new Date();

        for (const item of body.data) {
          if (!item || !item.symbol || !item.price) continue;

          const egxEntry = batch.find((b) => b.twelve === item.symbol);
          const egxSymbol = egxEntry?.egx ?? item.symbol;

          const price = Number(item.price);
          if (!Number.isFinite(price) || price <= 0) {
            failed.push(egxSymbol);
            continue;
          }

          const open = Number(item.open ?? item.price);
          const high = Number(item.high ?? item.price);
          const low = Number(item.low ?? item.price);
          const prev = Number(item.previous_close ?? item.price);
          const volume = Number(item.volume ?? 0);

          const previousClose = Number.isFinite(prev) && prev > 0 ? prev : price;
          const change = price - previousClose;
          const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

          const ts = item.datetime ? new Date(item.datetime) : now;

          const quote: StockQuote = {
            symbol: egxSymbol,
            price,
            change,
            changePercent,
            open: Number.isFinite(open) ? open : price,
            high: Number.isFinite(high) ? high : price,
            low: Number.isFinite(low) ? low : price,
            volume: Number.isFinite(volume) ? volume : 0,
            previousClose,
            timestamp: ts,
            source: 'TWELVE',
          };

          quotes.set(egxSymbol, quote);
        }
      } catch (err) {
        logger.error('TwelveDataSource: batch fetch failed', {
          symbols: batch.map((s) => s.egx),
          error: (err as Error).message,
        });
        batch.forEach((s) => failed.push(s.egx));
      }
    }

    const latency = Date.now() - start;
    logger.info('TwelveDataSource: fetchQuotes complete', {
      requested: symbols.length,
      success: quotes.size,
      failed: failed.length,
      latency,
    });

    return {
      quotes,
      failed,
      source: this.name,
      latency,
    };
  }

  /**
   * Map internal EGX symbol (e.g. "COMI.CA") to Twelve Data symbol (e.g. "COMI:XCAI").
   */
  private toTwelveSymbol(symbol: string): string {
    if (symbol.endsWith('.CA')) {
      const base = symbol.slice(0, -3);
      return `${base}:XCAI`;
    }
    return `${symbol}:XCAI`;
  }
}

