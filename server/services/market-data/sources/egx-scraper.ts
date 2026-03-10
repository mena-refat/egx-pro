import axios from 'axios';
import * as cheerio from 'cheerio';
import axiosRetry from 'axios-retry';
import type { IMarketDataSource, DataSourceResult, StockQuote } from '../types.ts';
import { logger } from '../../../lib/logger.ts';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
];

interface ProxyConfig {
  host: string;
  port: number;
}

const PROXIES: ProxyConfig[] = [
  // { host: '1.2.3.4', port: 8080 },
];

const EGX_BASE_URL = 'https://www.egx.com.eg/en/prices.aspx';

export class EgxScraperSource implements IMarketDataSource {
  name     = 'EGX';
  priority = 1;

  private axiosInstance = axios.create({
    timeout: 15_000,
    headers: { 'Accept-Language': 'ar,en;q=0.9' },
  });

  private lastBlockedAt = 0;
  private currentProxy  = 0;

  constructor() {
    axiosRetry(this.axiosInstance, {
      retries:           3,
      retryDelay:        axiosRetry.exponentialDelay,
      retryCondition:    (err) => err.response?.status === 429 || axiosRetry.isNetworkError(err),
      onRetry:           (count) => { logger.warn(`EGX scraper retry #${count}`); },
    });
  }

  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  private getNextProxy(): ProxyConfig | null {
    if (PROXIES.length === 0) return null;
    const proxy = PROXIES[this.currentProxy % PROXIES.length];
    this.currentProxy++;
    return proxy;
  }

  async isAvailable(): Promise<boolean> {
    const COOLDOWN_MS = 5 * 60 * 1000;
    if (Date.now() - this.lastBlockedAt < COOLDOWN_MS) {
      return false;
    }
    try {
      await this.axiosInstance.head(EGX_BASE_URL, {
        headers: { 'User-Agent': this.getRandomUserAgent() },
        timeout: 5_000,
      });
      return true;
    } catch {
      return false;
    }
  }

  async fetchQuotes(symbols: string[]): Promise<DataSourceResult> {
    const start  = Date.now();
    const quotes = new Map<string, StockQuote>();
    const failed: string[] = [];

    try {
      const delay = 1000 + Math.random() * 2000;
      await new Promise(r => setTimeout(r, delay));

      const proxy = this.getNextProxy();
      const config: Record<string, unknown> = {
        headers: {
          'User-Agent':      this.getRandomUserAgent(),
          'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ar-EG,ar;q=0.9,en;q=0.8',
          'Cache-Control':   'no-cache',
          'Referer':         'https://www.egx.com.eg/en/homepage.aspx',
        },
      };

      if (proxy) {
        const { HttpsProxyAgent } = await import('https-proxy-agent');
        (config as { httpsAgent?: unknown }).httpsAgent = new HttpsProxyAgent(`http://${proxy.host}:${proxy.port}`);
      }

      const response = await this.axiosInstance.get<string>(EGX_BASE_URL, config);

      if (response.status === 403 || response.status === 429) {
        this.lastBlockedAt = Date.now();
        throw new Error(`EGX blocked: ${response.status}`);
      }

      const $ = cheerio.load(response.data);
      const now = new Date();

      $('table tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 6) return;

        const symbolCell = $(cells[0]).text().trim();
        const priceText  = $(cells[1]).text().trim().replace(/,/g, '');
        const changeText = $(cells[2]).text().trim().replace(/,/g, '');
        const pctText    = $(cells[3]).text().trim().replace(/%/g, '').replace(/,/g, '');
        const openText   = (cells[4] && $(cells[4]).text()) ? $(cells[4]).text().trim().replace(/,/g, '') : priceText;
        const highText   = (cells[5] && $(cells[5]).text()) ? $(cells[5]).text().trim().replace(/,/g, '') : priceText;
        const lowText    = (cells[6] && $(cells[6]).text()) ? $(cells[6]).text().trim().replace(/,/g, '') : priceText;
        const volText    = (cells[7] && $(cells[7]).text()) ? $(cells[7]).text().trim().replace(/,/g, '') : '0';
        const prevText   = (cells[8] && $(cells[8]).text()) ? $(cells[8]).text().trim().replace(/,/g, '') : priceText;

        const price = parseFloat(priceText);
        if (!symbolCell || isNaN(price) || price <= 0) return;

        const matched = symbols.find(s =>
          symbolCell.includes(s) || s.replace('.CA', '') === symbolCell
        );
        if (!matched && symbols.length > 0) return;

        const symbol = matched ?? symbolCell;
        quotes.set(symbol, {
          symbol,
          price,
          change:        parseFloat(changeText) || 0,
          changePercent: parseFloat(pctText)    || 0,
          open:          parseFloat(openText)   || price,
          high:          parseFloat(highText)   || price,
          low:           parseFloat(lowText)    || price,
          volume:        parseFloat(volText)    || 0,
          previousClose: parseFloat(prevText)   || price,
          timestamp:     now,
          source:        'EGX',
        });
      });

      symbols.forEach(s => { if (!quotes.has(s)) failed.push(s); });

      logger.info(`EGX scraper: ${quotes.size} quotes, ${failed.length} failed, ${Date.now() - start}ms`);

    } catch (err: unknown) {
      logger.error('EGX scraper failed', { error: (err as Error).message });
      failed.push(...symbols);

      if ((err as Error).message?.includes('blocked')) {
        this.lastBlockedAt = Date.now();
      }
    }

    return { quotes, failed, source: this.name, latency: Date.now() - start };
  }
}
