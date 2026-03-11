import axios from 'axios';
import axiosRetry from 'axios-retry';
import type { IMarketDataSource, DataSourceResult, StockQuote } from '../types.ts';
import { logger } from '../../../lib/logger.ts';

const API_KEY  = process.env.TWELVE_DATA_API_KEY ?? '';
const BASE_URL = 'https://api.twelvedata.com';

export class TwelveDataSource implements IMarketDataSource {
  name     = 'TWELVEDATA';
  priority = 0;

  private client = axios.create({ timeout: 15_000 });
  private dailyCallCount    = 0;
  private dailyCallResetAt  = Date.now() + 24 * 60 * 60 * 1000;
  private minuteCallCount   = 0;
  private minuteCallResetAt = Date.now() + 60 * 1000;
  private readonly MAX_DAILY  = 780;
  private readonly MAX_MINUTE = 7;
  private readonly BATCH_SIZE = 120;

  constructor() {
    axiosRetry(this.client, {
      retries:        3,
      retryDelay:     axiosRetry.exponentialDelay,
      retryCondition: (err) =>
        axiosRetry.isNetworkError(err) ||
        err.response?.status === 429 ||
        (err.response?.status !== undefined && err.response.status >= 500),
    });
  }

  async isAvailable(): Promise<boolean> {
    if (!API_KEY) {
      logger.warn('TwelveData: TWELVE_DATA_API_KEY not set');
      return false;
    }

    if (Date.now() > this.dailyCallResetAt) {
      this.dailyCallCount   = 0;
      this.dailyCallResetAt = Date.now() + 24 * 60 * 60 * 1000;
    }

    if (this.dailyCallCount >= this.MAX_DAILY) {
      logger.warn(`TwelveData: daily limit reached (${this.dailyCallCount}/${this.MAX_DAILY})`);
      return false;
    }

    return true;
  }

  private async throttle(): Promise<void> {
    if (Date.now() > this.minuteCallResetAt) {
      this.minuteCallCount   = 0;
      this.minuteCallResetAt = Date.now() + 60 * 1000;
    }

    if (this.minuteCallCount >= this.MAX_MINUTE) {
      const waitMs = this.minuteCallResetAt - Date.now() + 100;
      logger.debug(`TwelveData: minute limit reached, waiting ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
      this.minuteCallCount   = 0;
      this.minuteCallResetAt = Date.now() + 60 * 1000;
    }

    this.minuteCallCount++;
    this.dailyCallCount++;
  }

  private toTwelveSymbol(symbol: string): string {
    return `${symbol}:XCAI`;
  }

  async fetchQuotes(symbols: string[]): Promise<DataSourceResult> {
    const start  = Date.now();
    const quotes = new Map<string, StockQuote>();
    const failed: string[] = [];

    const batches: string[][] = [];
    for (let i = 0; i < symbols.length; i += this.BATCH_SIZE) {
      batches.push(symbols.slice(i, i + this.BATCH_SIZE));
    }

    logger.info(`TwelveData: fetching ${symbols.length} symbols in ${batches.length} batch(es)`);

    for (const batch of batches) {
      try {
        await this.throttle();

        const twelveSymbols = batch.map(s => this.toTwelveSymbol(s)).join(',');

        const response = await this.client.get<Record<string, unknown>>(`${BASE_URL}/quote`, {
          params: {
            symbol:   twelveSymbols,
            apikey:   API_KEY,
            exchange: 'XCAI',
          },
        });

        // Debug: log raw response from Twelve Data
        logger.debug('TwelveData raw response', {
          batchSymbols:  batch.slice(0, 3),
          batchSize:     batch.length,
          responseType:  typeof response.data,
          responseKeys:  typeof response.data === 'object' ? Object.keys(response.data).slice(0, 10) : 'N/A',
          fullResponse:  JSON.stringify(response.data).slice(0, 1000),
        });

        const data = response.data;

        const isMultiple = batch.length > 1;

        const items: Array<{ egxSymbol: string; data: Record<string, unknown> }> = [];

        if (isMultiple) {
          for (const [key, value] of Object.entries(data)) {
            const egxSymbol = key.replace(':XCAI', '').toUpperCase();
            items.push({ egxSymbol, data: value as Record<string, unknown> });
          }
        } else {
          const egxSymbol = batch[0];
          items.push({ egxSymbol, data: data as Record<string, unknown> });
        }

        const now = new Date();

        for (const { egxSymbol, data: item } of items) {
          if (item.status === 'error' || item.code) {
            logger.debug(`TwelveData: symbol error for ${egxSymbol}`, {
              code:    item.code,
              message: item.message,
            });
            failed.push(egxSymbol);
            continue;
          }

          const price = parseFloat(String(item.close ?? item.price ?? 0));
          if (isNaN(price) || price <= 0) {
            failed.push(egxSymbol);
            continue;
          }

          quotes.set(egxSymbol, {
            symbol:        egxSymbol,
            price,
            change:        parseFloat(String(item.change ?? 0)) || 0,
            changePercent: parseFloat(String(item.percent_change ?? 0)) || 0,
            open:          parseFloat(String(item.open ?? price)) || price,
            high:          parseFloat(String(item.high ?? price)) || price,
            low:           parseFloat(String(item.low ?? price)) || price,
            volume:        parseFloat(String(item.volume ?? 0)) || 0,
            previousClose: parseFloat(String(item.previous_close ?? price)) || price,
            timestamp:     item.datetime ? new Date(String(item.datetime)) : now,
            source:        'TWELVEDATA',
          });
        }

        logger.info(`TwelveData batch: ${quotes.size} quotes so far, daily calls used: ${this.dailyCallCount}`);

      } catch (err: unknown) {
        const msg = (err as Error).message;
        logger.error('TwelveData batch failed', { error: msg, batch: batch.slice(0, 3) });

        if (msg.includes('429') || msg.includes('rate')) {
          logger.warn('TwelveData: rate limited, stopping');
          failed.push(...symbols.filter(s => !quotes.has(s)));
          break;
        }

        failed.push(...batch);
      }
    }

    symbols.forEach(s => { if (!quotes.has(s) && !failed.includes(s)) failed.push(s); });

    logger.info(`TwelveData: ${quotes.size} quotes, ${failed.length} failed, ${Date.now() - start}ms, daily calls: ${this.dailyCallCount}/${this.MAX_DAILY}`);

    return { quotes, failed, source: this.name, latency: Date.now() - start };
  }
}
