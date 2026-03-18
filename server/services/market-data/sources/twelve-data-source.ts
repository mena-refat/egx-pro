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
  status?: string;
  code?: number;
};

/**
 * Twelve Data API returns different shapes depending on how many symbols are requested:
 * - Multiple symbols: { data: [ { symbol, price, ... }, ... ] }
 * - Single symbol:   { symbol, price, ... }   (the object directly, no "data" wrapper)
 * - Error:           { code: 400, message: "...", status: "error" }
 */
type TwelveDataResponse =
  | { data: TwelveDataQuote[] }
  | TwelveDataQuote
  | { code?: number; message?: string; status?: string };

/**
 * Twelve Data source:
 * - Primary live price source (priority = 0)
 * - Batch symbols in a single comma-separated request
 * - Handles both single-symbol and multi-symbol response shapes
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
      timeout: 15_000,
    });
  }

  private hasApiKey(): boolean {
    return Boolean(process.env.TWELVE_DATA_API_KEY);
  }

  /**
   * Simply checks for API key presence — no probe request needed.
   * If the key is configured, we consider TwelveData available and let
   * the actual fetch handle any runtime errors gracefully.
   */
  async isAvailable(): Promise<boolean> {
    if (!this.hasApiKey()) {
      logger.warn('TwelveDataSource: TWELVE_DATA_API_KEY not configured, marking unavailable');
      return false;
    }
    return true;
  }

  async fetchQuotes(symbols: string[]): Promise<DataSourceResult> {
    const start = Date.now();
    const quotes = new Map<string, StockQuote>();
    const failed: string[] = [];

    if (!this.hasApiKey()) {
      logger.warn('TwelveDataSource: no API key, skipping fetch');
      return { quotes, failed: [...symbols], source: this.name, latency: 0 };
    }

    // Twelve Data expects e.g. "COMI:XCAI" not "COMI.CA"
    const mappedSymbols = symbols.map((s) => ({ egx: s, twelve: this.toTwelveSymbol(s) }));

    // Break into batches of BATCH_SIZE
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

        // Normalize to array — handle both response shapes
        let items: TwelveDataQuote[] = [];

        if ('data' in body && Array.isArray((body as { data: TwelveDataQuote[] }).data)) {
          // Multi-symbol response: { data: [...] }
          items = (body as { data: TwelveDataQuote[] }).data;
        } else if ('symbol' in body && 'price' in body) {
          // Single-symbol response: the object directly
          items = [body as TwelveDataQuote];
        } else {
          // Error response
          logger.warn('TwelveDataSource: unexpected response shape', { body });
          batch.forEach((s) => failed.push(s.egx));
          continue;
        }

        const now = new Date();

        for (const item of items) {
          if (!item || !item.symbol || !item.price) continue;

          // Skip if TwelveData returned an error for this symbol
          if (item.status === 'error' || item.code != null) {
            const egxEntry = batch.find((b) => b.twelve === item.symbol);
            if (egxEntry) failed.push(egxEntry.egx);
            continue;
          }

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

        // Any symbol from this batch not found in the response → mark as failed
        for (const entry of batch) {
          if (!quotes.has(entry.egx) && !failed.includes(entry.egx)) {
            failed.push(entry.egx);
          }
        }

      } catch (err) {
        logger.error('TwelveDataSource: batch fetch failed', {
          batchSize: batch.length,
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

    return { quotes, failed, source: this.name, latency };
  }

  /**
   * Map internal EGX symbol (e.g. "COMI.CA" or "COMI") to Twelve Data format ("COMI:XCAI").
   */
  private toTwelveSymbol(symbol: string): string {
    const base = symbol.endsWith('.CA') ? symbol.slice(0, -3) : symbol;
    return `${base}:XCAI`;
  }
}
