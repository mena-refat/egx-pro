import axios from 'axios';
import type { IMarketDataSource, DataSourceResult, StockQuote } from '../types.ts';
import { logger } from '../../../lib/logger.ts';

const EGXLYTICS_API_URL = process.env.EGXLYTICS_API_URL ?? '';
const EGXLYTICS_API_KEY = process.env.EGXLYTICS_API_KEY ?? '';

export class EgxlyticsSource implements IMarketDataSource {
  name     = 'EGXLYTICS';
  priority = 0; // أعلى priority — هيكون Source #1 لما يتفعّل

  async isAvailable(): Promise<boolean> {
    if (!EGXLYTICS_API_URL || !EGXLYTICS_API_KEY) return false;

    try {
      await axios.get(`${EGXLYTICS_API_URL}/health`, {
        headers: { Authorization: `Bearer ${EGXLYTICS_API_KEY}` },
        timeout: 3_000,
      });
      return true;
    } catch {
      return false;
    }
  }

  async fetchQuotes(symbols: string[]): Promise<DataSourceResult> {
    const start  = Date.now();
    const quotes = new Map<string, StockQuote>();

    try {
      const res = await axios.get<{ data?: unknown[] }>(`${EGXLYTICS_API_URL}/quotes`, {
        params:  { symbols: symbols.join(',') },
        headers: { Authorization: `Bearer ${EGXLYTICS_API_KEY}` },
        timeout: 10_000,
      });

      const data = res.data?.data ?? res.data;
      (Array.isArray(data) ? data : []).forEach((item: Record<string, unknown>) => {
        const symbol = item.symbol as string;
        if (!symbol) return;
        const price = item.price as number;
        if (typeof price !== 'number' || price <= 0) return;
        quotes.set(symbol, {
          symbol,
          price,
          change:        (item.change as number) ?? 0,
          changePercent: (item.changePercent as number) ?? 0,
          open:          (item.open as number) ?? price,
          high:          (item.high as number) ?? price,
          low:           (item.low as number) ?? price,
          volume:        (item.volume as number) ?? 0,
          previousClose: (item.previousClose as number) ?? price,
          timestamp:     new Date(),
          source:        'EGXLYTICS',
        });
      });

    } catch (err: unknown) {
      logger.error('EGXlytics failed', { error: (err as Error).message });
    }

    return {
      quotes,
      failed:  symbols.filter(s => !quotes.has(s)),
      source:  this.name,
      latency: Date.now() - start,
    };
  }
}
