import axios, { type AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import axiosRetry from 'axios-retry';
import type { IMarketDataSource, DataSourceResult, StockQuote } from '../types.ts';
import { logger } from '../../../lib/logger.ts';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

const EGX_URL = 'https://www.egx.com.eg/ar/prices.aspx';

export class EgxScraperSource implements IMarketDataSource {
  name     = 'EGX';
  priority = 1;

  private client: AxiosInstance;
  private cachedViewState: string | null       = null;
  private cachedViewStateGen: string | null    = null;
  private viewStateFetchedAt                   = 0;
  private readonly VIEW_STATE_TTL_MS           = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.client = axios.create({
      timeout: 20_000,
      withCredentials: true,
      headers: {
        'User-Agent':      USER_AGENTS[0],
        'Accept-Language': 'ar-EG,ar;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection':      'keep-alive',
      },
    });

    axiosRetry(this.client, {
      retries:        3,
      retryDelay:     axiosRetry.exponentialDelay,
      retryCondition: (err) =>
        axiosRetry.isNetworkError(err) ||
        (err.response?.status !== undefined && err.response.status >= 500),
    });
  }

  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  private async fetchViewState(): Promise<{ viewState: string; viewStateGen: string; cookies: string }> {
    const age = Date.now() - this.viewStateFetchedAt;
    if (this.cachedViewState && age < this.VIEW_STATE_TTL_MS) {
      return {
        viewState:    this.cachedViewState,
        viewStateGen: this.cachedViewStateGen ?? 'BBE9C241',
        cookies:      '',
      };
    }

    logger.debug('EGX: fetching fresh __VIEWSTATE');

    const response = await this.client.get<string>(EGX_URL, {
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept':     'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Referer':    'https://www.egx.com.eg/ar/homepage.aspx',
      },
    });

    const $ = cheerio.load(response.data);

    const viewState    = ($('input[name="__VIEWSTATE"]').val() ?? '') as string;
    const viewStateGen = ($('input[name="__VIEWSTATEGENERATOR"]').val() ?? 'BBE9C241') as string;

    if (!viewState) {
      throw new Error('EGX: could not extract __VIEWSTATE from page');
    }

    this.cachedViewState    = viewState;
    this.cachedViewStateGen = viewStateGen;
    this.viewStateFetchedAt = Date.now();

    const rawCookies = response.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies)
      ? rawCookies.map((c: string) => c.split(';')[0]).join('; ')
      : '';

    logger.debug('EGX: __VIEWSTATE extracted', {
      viewStateLen: viewState.length,
      viewStateGen,
      cookies: cookies.slice(0, 80),
    });

    return { viewState, viewStateGen, cookies };
  }

  private async postForPrices(
    viewState: string,
    viewStateGen: string,
    cookies: string
  ): Promise<string> {
    const params = new URLSearchParams();
    params.append('ctl00$ScriptManager1',    'ctl00$C$S$up|ctl00$C$S$lkMarket');
    params.append('__EVENTTARGET',           'ctl00$C$S$lkMarket');
    params.append('__EVENTARGUMENT',         '');
    params.append('__VIEWSTATE',             viewState);
    params.append('__VIEWSTATEGENERATOR',    viewStateGen);
    params.append('ctl00$H$txtSearchAll',    '');
    params.append('ctl00$H$rblSearchType',   '1');
    params.append('ctl00$C$S$TextBox1',      'ادخل جزء من أسم الشركة');
    params.append('hiddenInputToUpdateATBuffer_CommonToolkitScripts', '1');

    const headers: Record<string, string> = {
      'User-Agent':     this.getRandomUserAgent(),
      'Content-Type':  'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept':        '*/*',
      'Referer':       EGX_URL,
      'Origin':        'https://www.egx.com.eg',
      'X-Requested-With': 'XMLHttpRequest',
      'X-MicrosoftAjax':  'Delta=true',
      'Cache-Control': 'no-cache',
    };

    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const response = await this.client.post<string>(EGX_URL, params.toString(), { headers });

    if (typeof response.data !== 'string') {
      throw new Error(`EGX POST: unexpected response type: ${typeof response.data}`);
    }

    return response.data;
  }

  private parseHtml(html: string, symbols: string[]): Map<string, StockQuote> {
    const quotes = new Map<string, StockQuote>();

    logger.debug('EGX raw response snippet', {
      length: html.length,
      sample: html.slice(0, 800),
    });

    const $ = cheerio.load(html);
    const now = new Date();
    const symbolSet = new Set(symbols.map(s => s.toUpperCase()));

    const tableSelectors = [
      'table.rgMasterTable tbody tr',
      'table[id*="GridView"] tbody tr',
      '#ctl00_C_S_GridView1 tr',
      'table tbody tr',
    ];

    let rowsFound = 0;

    for (const selector of tableSelectors) {
      const rows = $(selector);
      if (rows.length === 0) continue;

      rows.each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 12) return;

        const isinOrName  = $(cells[0]).text().trim();
        const nameCell    = $(cells[1]).text().trim();
        const prevClose   = $(cells[3]).text().trim().replace(/,/g, '');
        const openPrice   = $(cells[4]).text().trim().replace(/,/g, '');
        const closePrice  = $(cells[5]).text().trim().replace(/,/g, '');
        const chgPer      = $(cells[6]).text().trim().replace(/[%,]/g, '');
        const lastPrice   = $(cells[7]).text().trim().replace(/,/g, '');
        const high        = $(cells[8]).text().trim().replace(/,/g, '');
        const low         = $(cells[9]).text().trim().replace(/,/g, '');
        const volume      = $(cells[11]).text().trim().replace(/,/g, '');

        const rawSymbol = (isinOrName.length <= 10 ? isinOrName : nameCell).toUpperCase();
        const price     = parseFloat(lastPrice || closePrice || openPrice);

        if (!rawSymbol || isNaN(price) || price <= 0) return;

        const matched = symbolSet.size === 0
          ? rawSymbol
          : Array.from(symbolSet).find(s =>
              rawSymbol.includes(s) || s.includes(rawSymbol)
            );

        if (symbolSet.size > 0 && !matched) return;

        const symbol = matched ?? rawSymbol;
        rowsFound++;

        const prevCloseNum = parseFloat(prevClose) || price;
        const change       = price - prevCloseNum;

        quotes.set(symbol, {
          symbol,
          price,
          change,
          changePercent: parseFloat(chgPer) || (prevCloseNum > 0 ? (change / prevCloseNum) * 100 : 0),
          open:          parseFloat(openPrice)  || price,
          high:          parseFloat(high)        || price,
          low:           parseFloat(low)         || price,
          volume:        parseFloat(volume)      || 0,
          previousClose: prevCloseNum,
          timestamp:     now,
          source:        'EGX',
        });
      });

      if (rowsFound > 0) {
        logger.info(`EGX parsed ${rowsFound} rows using selector: "${selector}"`);
        break;
      }
    }

    if (quotes.size === 0) {
      const tables = $('table').length;
      const allText = $('body').text().slice(0, 500);
      logger.warn('EGX: could not parse any rows', {
        tablesFound: tables,
        bodyPreview: allText,
      });
    }

    return quotes;
  }

  async fetchQuotes(symbols: string[]): Promise<DataSourceResult> {
    const start  = Date.now();
    const failed: string[] = [];

    try {
      const { viewState, viewStateGen, cookies } = await this.fetchViewState();

      await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));

      const html = await this.postForPrices(viewState, viewStateGen, cookies);

      this.cachedViewState    = null;
      this.viewStateFetchedAt = 0;

      const quotes = this.parseHtml(html, symbols);

      symbols.forEach(s => { if (!quotes.has(s)) failed.push(s); });

      logger.info(`EGX scraper: ${quotes.size} quotes, ${failed.length} failed, ${Date.now() - start}ms`);

      return { quotes, failed, source: this.name, latency: Date.now() - start };

    } catch (err: unknown) {
      logger.error('EGX scraper error', { error: (err as Error).message });
      return { quotes: new Map(), failed: [...symbols], source: this.name, latency: Date.now() - start };
    }
  }
}
