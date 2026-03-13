/**
 * Stooq.com data source for EGX stocks.
 * - Free, no API key needed.
 * - Supports batching: up to 50 symbols per request.
 * - EGX symbol format: COMI → comi.eg
 * - Returns 15-min delayed data during market hours.
 * - previousClose is tracked in memory between polls:
 *   first poll uses open as approximation, subsequent polls are accurate.
 */
import type { IMarketDataSource, DataSourceResult, StockQuote } from '../types.ts';
import { logger } from '../../../lib/logger.ts';

const STOOQ_BASE = 'https://stooq.com/q/l/';
/** fields: Symbol, Date, Time, Open, High, Low, Close, Volume */
const STOOQ_FORMAT = 'sd2t2ohlcv';
const BATCH_SIZE = 50;
const FETCH_TIMEOUT_MS = 15_000;
const PROBE_SYMBOL = 'comi.eg';

export class StooqSource implements IMarketDataSource {
  name = 'STOOQ';
  priority = 1;

  /** Stores last known close price for change/changePercent calculation */
  private prevCloseMap = new Map<string, number>();

  private toStooqSymbol(egxSymbol: string): string {
    return `${egxSymbol.toLowerCase()}.eg`;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const url = `${STOOQ_BASE}?s=${PROBE_SYMBOL}&f=${STOOQ_FORMAT}&h&e=csv`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
      if (!res.ok) return false;
      const text = await res.text();
      // Valid response has at least 2 lines (header + data)
      return text.trim().split('\n').length >= 2;
    } catch {
      return false;
    }
  }

  async fetchQuotes(symbols: string[]): Promise<DataSourceResult> {
    const start = Date.now();
    const quotes = new Map<string, StockQuote>();
    const failed: string[] = [];

    // Process in batches to avoid URL length limits
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      const stooqSymbols = batch.map((s) => this.toStooqSymbol(s)).join(',');

      // Build reverse map: stooq symbol → EGX symbol
      const stooqToEgx = new Map<string, string>(
        batch.map((s) => [this.toStooqSymbol(s), s])
      );

      try {
        const url = `${STOOQ_BASE}?s=${stooqSymbols}&f=${STOOQ_FORMAT}&h&e=csv`;
        const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

        if (!res.ok) {
          logger.warn('Stooq batch failed', { status: res.status, batch: batch.length });
          failed.push(...batch);
          continue;
        }

        const csv = await res.text();
        const rows = csv.trim().split('\n');
        // First line is header: Symbol,Date,Time,Open,High,Low,Close,Volume
        const dataRows = rows.slice(1);

        const fetchedSymbols = new Set<string>();

        for (const row of dataRows) {
          const parts = row.split(',');
          if (parts.length < 8) continue;

          const [rawSymbol, , , rawOpen, rawHigh, rawLow, rawClose, rawVolume] = parts;
          if (!rawSymbol) continue;

          const stooqSym = rawSymbol.trim().toLowerCase();
          const egxSymbol = stooqToEgx.get(stooqSym);
          if (!egxSymbol) continue;

          const price = parseFloat(rawClose);
          if (!Number.isFinite(price) || price <= 0) {
            logger.warn('Stooq: invalid price', { egxSymbol, rawClose });
            continue;
          }

          fetchedSymbols.add(egxSymbol);

          const open    = parseFloat(rawOpen) || price;
          const high    = parseFloat(rawHigh) || price;
          const low     = parseFloat(rawLow) || price;
          const volume  = parseInt(rawVolume, 10) || 0;

          // previousClose: use stored value from previous poll, else fall back to open
          const previousClose = this.prevCloseMap.get(egxSymbol) ?? open;
          const change        = price - previousClose;
          const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

          // Store current close for next poll's previousClose calculation
          this.prevCloseMap.set(egxSymbol, price);

          quotes.set(egxSymbol, {
            symbol: egxSymbol,
            price,
            change,
            changePercent,
            open,
            high,
            low,
            volume,
            previousClose,
            timestamp: new Date(),
            source: 'STOOQ',
          });
        }

        // Mark any batch items not returned by Stooq as failed
        for (const sym of batch) {
          if (!fetchedSymbols.has(sym)) {
            failed.push(sym);
          }
        }
      } catch (err: unknown) {
        logger.error('Stooq: batch fetch threw', { error: (err as Error).message });
        failed.push(...batch);
      }
    }

    const latency = Date.now() - start;
    logger.info('Stooq: fetchQuotes complete', {
      requested: symbols.length,
      success: quotes.size,
      failed: failed.length,
      latency,
    });

    return { quotes, failed, source: this.name, latency };
  }
}
