import { createHash } from 'crypto';
import type { NewsSourceType } from '@prisma/client';
import { EGX_STOCKS } from '../lib/egxStocks.ts';
import { logger } from '../lib/logger.ts';
import { withRetry } from '../lib/retry.ts';
import { NewsRepository } from '../repositories/news.repository.ts';
import { prisma } from '../lib/prisma.ts';
import { analysisEngine } from './ai/index.ts';
import { getCache, setCache } from '../lib/redis.ts';
import { NEWS_INGEST_SUMMARY_SYSTEM } from '../lib/newsAnalysisPrompts.ts';

const NEWS_API_KEY = process.env.NEWS_API_KEY?.trim() ?? '';
const GOOGLE_MARKET_QUERY = 'EGX OR "Egyptian Exchange" OR "البورصة المصرية"';
const MARKET_REFRESH_MS = 20 * 60 * 1000;
const TICKER_REFRESH_MS = 30 * 60 * 1000;
const NEWS_RETENTION_DAYS = 14;
const DEFAULT_LIMIT = 20;
const ANALYSIS_LIMIT = 5;
/** Max general (market-wide) news articles stored per calendar day (Cairo time) */
const DAILY_MARKET_NEWS_LIMIT = 30;

/** Start of the current calendar day in Africa/Cairo time (UTC+2, no DST). */
function cairoStartOfDay(): Date {
  const offsetMs = 2 * 60 * 60 * 1000; // UTC+2
  const cairoMs = Date.now() + offsetMs;
  const midnight = new Date(cairoMs);
  midnight.setUTCHours(0, 0, 0, 0);
  return new Date(midnight.getTime() - offsetMs);
}

export type NewsArticle = {
  title: string;
  summary: string;
  source: string;
  sourceType: NewsSourceType;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  url: string;
  tickers: string[];
  isMarketWide: boolean;
};

type IngestedNews = {
  externalId: string;
  title: string;
  summary?: string | null;
  source: string;
  sourceType: NewsSourceType;
  url: string;
  publishedAt: Date;
  fetchedAt: Date;
  language?: string | null;
  sentiment?: string | null;
  tickers: string[];
  isMarketWide: boolean;
};

const companyIndex = EGX_STOCKS.map((stock) => ({
  ticker: stock.ticker.toUpperCase(),
  nameAr: stock.nameAr.toLowerCase(),
  nameEn: stock.nameEn.toLowerCase(),
}));

function decodeHtml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function stripHtml(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
}

function pickTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeHtml(match[1]) : '';
}

function computeSentiment(title: string, summary: string): 'positive' | 'negative' | 'neutral' {
  const text = `${title} ${summary}`.toLowerCase();
  const positiveWords = ['أرباح', 'نمو', 'صعود', 'ارتفاع', 'إيجابي', 'توسع', 'profit', 'growth', 'rise'];
  const negativeWords = ['خسائر', 'هبوط', 'تراجع', 'سلبي', 'انخفاض', 'loss', 'fall', 'decline'];
  if (positiveWords.some((word) => text.includes(word))) return 'positive';
  if (negativeWords.some((word) => text.includes(word))) return 'negative';
  return 'neutral';
}

function buildExternalId(sourceType: NewsSourceType, url: string, title: string): string {
  return createHash('sha256')
    .update(`${sourceType}|${url}|${title}`)
    .digest('hex');
}

function resolveTickers(text: string, explicitTicker?: string): string[] {
  const normalized = text.toLowerCase();
  const tickers = new Set<string>();
  if (explicitTicker) tickers.add(explicitTicker.toUpperCase());
  for (const stock of companyIndex) {
    if (
      normalized.includes(stock.ticker.toLowerCase()) ||
      normalized.includes(stock.nameAr) ||
      normalized.includes(stock.nameEn)
    ) {
      tickers.add(stock.ticker);
    }
  }
  return Array.from(tickers);
}

function toNewsArticle(item: {
  title: string;
  summary: string | null;
  source: string;
  sourceType: NewsSourceType;
  publishedAt: Date;
  sentiment: string | null;
  url: string;
  isMarketWide: boolean;
  tickers?: Array<{ ticker: string }>;
}): NewsArticle {
  return {
    title: item.title,
    summary: item.summary ?? '',
    source: item.source,
    sourceType: item.sourceType,
    publishedAt: item.publishedAt.toISOString(),
    sentiment: (item.sentiment as NewsArticle['sentiment']) ?? 'neutral',
    url: item.url,
    tickers: item.tickers?.map((row) => row.ticker) ?? [],
    isMarketWide: item.isMarketWide,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await withRetry(() => fetch(url), { maxAttempts: 2, baseDelayMs: 1500 });
  if (!response.ok) {
    throw new Error(`NEWS_FETCH_FAILED_${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await withRetry(() => fetch(url), { maxAttempts: 2, baseDelayMs: 1500 });
  if (!response.ok) {
    throw new Error(`NEWS_FETCH_FAILED_${response.status}`);
  }
  return response.text();
}

async function fetchNewsApi(query: string, explicitTicker?: string, isMarketWide = false): Promise<IngestedNews[]> {
  if (!NEWS_API_KEY) return [];
  type NewsApiResponse = {
    articles?: Array<{
      title?: string;
      description?: string;
      content?: string;
      source?: { name?: string };
      publishedAt?: string;
      url?: string;
    }>;
  };
  const encoded = encodeURIComponent(query);
  const data = await fetchJson<NewsApiResponse>(
    `https://newsapi.org/v2/everything?q=${encoded}&sortBy=publishedAt&pageSize=15&apiKey=${NEWS_API_KEY}`
  );
  const fetchedAt = new Date();
  return (data.articles ?? [])
    .filter((article) => article.title && article.url && article.publishedAt)
    .map((article) => {
      const title = stripHtml(article.title ?? '');
      const summary = stripHtml(article.description || article.content || '');
      const tickers = resolveTickers(`${title} ${summary}`, explicitTicker);
      return {
        externalId: buildExternalId('NEWS_API', article.url ?? '', title),
        title,
        summary,
        source: article.source?.name?.trim() || 'NewsAPI',
        sourceType: 'NEWS_API' as const,
        url: article.url ?? '',
        publishedAt: new Date(article.publishedAt ?? fetchedAt.toISOString()),
        fetchedAt,
        language: null,
        sentiment: computeSentiment(title, summary),
        tickers,
        isMarketWide,
      };
    });
}

async function fetchGoogleRss(query: string, explicitTicker?: string, isMarketWide = false): Promise<IngestedNews[]> {
  const encoded = encodeURIComponent(query);
  const xml = await fetchText(`https://news.google.com/rss/search?q=${encoded}&hl=ar&gl=EG&ceid=EG:ar`);
  const fetchedAt = new Date();
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  return items.map((item) => {
    const title = stripHtml(pickTag(item, 'title'));
    const summary = stripHtml(pickTag(item, 'description'));
    const url = pickTag(item, 'link');
    const publishedAt = pickTag(item, 'pubDate');
    const tickers = resolveTickers(`${title} ${summary}`, explicitTicker);
    return {
      externalId: buildExternalId('GOOGLE_RSS', url, title),
      title,
      summary,
      source: stripHtml(pickTag(item, 'source')) || 'Google News',
      sourceType: 'GOOGLE_RSS' as const,
      url,
      publishedAt: publishedAt ? new Date(publishedAt) : fetchedAt,
      fetchedAt,
      language: 'ar',
      sentiment: computeSentiment(title, summary),
      tickers,
      isMarketWide,
    };
  }).filter((item) => item.title && item.url);
}

async function fetchEgxDisclosures(): Promise<IngestedNews[]> {
  const html = await fetchText('https://www.egx.com.eg/en/Disclosure_Reports.aspx');
  const fetchedAt = new Date();
  const rowMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const rows = rowMatches
    .map((row) => {
      const hrefMatch = row.match(/href="([^"]+)"/i);
      const url = hrefMatch?.[1]
        ? new URL(hrefMatch[1], 'https://www.egx.com.eg').toString()
        : '';
      const title = stripHtml(row);
      const dateMatch = row.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      const publishedAt = dateMatch
        ? new Date(dateMatch[1].split('/').reverse().join('-'))
        : fetchedAt;
      const tickers = resolveTickers(title);
      return {
        externalId: buildExternalId('EGX_DISCLOSURE', url || title, title),
        title,
        summary: 'EGX disclosure report',
        source: 'EGX',
        sourceType: 'EGX_DISCLOSURE' as const,
        url: url || 'https://www.egx.com.eg/en/Disclosure_Reports.aspx',
        publishedAt,
        fetchedAt,
        language: 'en',
        sentiment: 'neutral',
        tickers,
        isMarketWide: tickers.length === 0,
      };
    })
    .filter((row) => row.title.length > 10);
  return rows.slice(0, 30);
}

async function isStale(maxAgeMs: number, ticker?: string): Promise<boolean> {
  const latest = await NewsRepository.getLatestFetchedAt(undefined, ticker);
  if (!latest?.fetchedAt) return true;
  return Date.now() - latest.fetchedAt.getTime() > maxAgeMs;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI ingest summarization — runs BEFORE persist()
// ─────────────────────────────────────────────────────────────────────────────

/** Minimum description length to bother summarizing (saves API calls on stubs) */
const MIN_DESC_FOR_SUMMARY = 80;
/** Process N articles in parallel — avoids hammering the AI API */
const INGEST_BATCH = 5;
/** Redis TTL for ingest cache — 7 days (same article won't be re-summarized) */
const INGEST_CACHE_TTL_S = 7 * 24 * 60 * 60;

function ingestCacheKey(title: string, description: string): string {
  return 'ai:ingest:' + createHash('sha256').update(`${title}|${description}`).digest('hex');
}

function parseIngestJson(text: string): { title: string; summary: string } | null {
  try {
    const raw = JSON.parse(text) as unknown;
    if (raw && typeof raw === 'object' && 'title' in raw && 'summary' in raw) {
      const r = raw as Record<string, unknown>;
      const title   = typeof r.title   === 'string' ? r.title.trim().slice(0, 120)   : '';
      const summary = typeof r.summary === 'string' ? r.summary.trim().slice(0, 200) : '';
      if (title && summary) return { title, summary };
    }
    return null;
  } catch {
    // Try stripping markdown fences
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const first = cleaned.indexOf('{');
    const last  = cleaned.lastIndexOf('}');
    if (first !== -1 && last > first) return parseIngestJson(cleaned.slice(first, last + 1));
    return null;
  }
}

async function summarizeOne(item: IngestedNews): Promise<IngestedNews> {
  const description = item.summary?.trim() ?? '';

  // Skip stubs — EGX disclosures have very short descriptions, not worth summarizing
  if (description.length < MIN_DESC_FOR_SUMMARY) return item;

  const key = ingestCacheKey(item.title, description);

  // Redis cache hit → return immediately (free)
  const cached = await getCache<{ title: string; summary: string }>(key);
  if (cached) return { ...item, title: cached.title, summary: cached.summary };

  // AI call — Gemini Flash via the router
  const userMsg =
    `Title: ${item.title.slice(0, 200)}\nDescription: ${description.slice(0, 800)}`;

  const result = await analysisEngine.generate({
    taskType:     'news_ingest_summary',
    systemPrompt: NEWS_INGEST_SUMMARY_SYSTEM,
    userMessage:  userMsg,
    maxTokens:    150,
    responseType: 'json',
    temperature:  0.1,
  });

  const parsed = parseIngestJson(result.text);
  if (!parsed) return item; // fallback to original

  await setCache(key, parsed, INGEST_CACHE_TTL_S);
  return { ...item, title: parsed.title, summary: parsed.summary };
}

/**
 * Summarize a batch of articles before they are persisted.
 * Runs in parallel chunks of INGEST_BATCH; failures fall back to the original.
 */
async function summarizeForIngest(items: IngestedNews[]): Promise<IngestedNews[]> {
  if (items.length === 0) return items;

  const results: IngestedNews[] = [...items];

  for (let i = 0; i < items.length; i += INGEST_BATCH) {
    const chunk   = items.slice(i, i + INGEST_BATCH);
    const settled = await Promise.allSettled(chunk.map((item) => summarizeOne(item)));

    settled.forEach((outcome, j) => {
      if (outcome.status === 'fulfilled') {
        results[i + j] = outcome.value;
      } else {
        logger.warn('News ingest summarization failed (non-fatal, using original)', {
          title: chunk[j].title.slice(0, 60),
          error: outcome.reason instanceof Error ? outcome.reason.message : 'UNKNOWN',
        });
        // results[i + j] already holds the original item — no action needed
      }
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────

async function persist(items: IngestedNews[]): Promise<number> {
  if (items.length === 0) return 0;
  return NewsRepository.upsertMany(items);
}

export const NewsService = {
  async syncMarketSources(): Promise<number> {
    const [googleItems, newsApiItems, egxItems] = await Promise.allSettled([
      fetchGoogleRss(GOOGLE_MARKET_QUERY, undefined, true),
      fetchNewsApi(GOOGLE_MARKET_QUERY, undefined, true),
      fetchEgxDisclosures(),
    ]);
    const merged = [
      ...(googleItems.status === 'fulfilled' ? googleItems.value : []),
      ...(newsApiItems.status === 'fulfilled' ? newsApiItems.value : []),
      ...(egxItems.status === 'fulfilled' ? egxItems.value : []),
    ];
    if (googleItems.status === 'rejected') {
      logger.warn('Google RSS market sync failed', { error: googleItems.reason instanceof Error ? googleItems.reason.message : 'UNKNOWN_ERROR' });
    }
    if (newsApiItems.status === 'rejected') {
      logger.warn('NewsAPI market sync failed', { error: newsApiItems.reason instanceof Error ? newsApiItems.reason.message : 'UNKNOWN_ERROR' });
    }
    if (egxItems.status === 'rejected') {
      logger.warn('EGX disclosures sync failed', { error: egxItems.reason instanceof Error ? egxItems.reason.message : 'UNKNOWN_ERROR' });
    }

    // ── Split: direct company mentions vs pure market/economy news ────────────
    // Any article that resolves to at least one EGX ticker is company-specific
    // (no daily limit). Pure market/economy articles are capped at 30/day.
    const companyArticles: IngestedNews[] = [];
    const marketArticles: IngestedNews[] = [];
    for (const item of merged) {
      if (item.tickers.length > 0) {
        companyArticles.push({ ...item, isMarketWide: false });
      } else {
        marketArticles.push({ ...item, isMarketWide: true });
      }
    }

    // ── Apply daily cap on market-wide articles ───────────────────────────────
    const dayStart = cairoStartOfDay();
    const alreadyToday = await NewsRepository.countMarketWideSince(dayStart);
    const remaining = Math.max(0, DAILY_MARKET_NEWS_LIMIT - alreadyToday);

    // Keep the most recently published ones within the remaining quota
    const topMarketArticles = marketArticles
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, remaining);

    if (marketArticles.length > remaining) {
      logger.info('News market cap applied', {
        fetched: marketArticles.length,
        alreadyToday,
        persisting: topMarketArticles.length,
        limit: DAILY_MARKET_NEWS_LIMIT,
      });
    }

    const toIngest = [...companyArticles, ...topMarketArticles];
    const summarized = await summarizeForIngest(toIngest);
    return persist(summarized);
  },

  async syncTickerSources(ticker: string, companyName?: string): Promise<number> {
    const normalizedTicker = ticker.trim().toUpperCase();
    const stock = EGX_STOCKS.find((item) => item.ticker.toUpperCase() === normalizedTicker);
    const query = [normalizedTicker, stock?.nameAr, stock?.nameEn, companyName]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' OR ');

    const [googleItems, newsApiItems] = await Promise.allSettled([
      fetchGoogleRss(query, normalizedTicker, false),
      fetchNewsApi(query, normalizedTicker, false),
    ]);

    const merged = [
      ...(googleItems.status === 'fulfilled' ? googleItems.value : []),
      ...(newsApiItems.status === 'fulfilled' ? newsApiItems.value : []),
    ];

    if (googleItems.status === 'rejected') {
      logger.warn('Google RSS ticker sync failed', {
        ticker: normalizedTicker,
        error: googleItems.reason instanceof Error ? googleItems.reason.message : 'UNKNOWN_ERROR',
      });
    }
    if (newsApiItems.status === 'rejected') {
      logger.warn('NewsAPI ticker sync failed', {
        ticker: normalizedTicker,
        error: newsApiItems.reason instanceof Error ? newsApiItems.reason.message : 'UNKNOWN_ERROR',
      });
    }

    const summarized = await summarizeForIngest(merged);
    return persist(summarized);
  },

  async getMarket(limit = DEFAULT_LIMIT): Promise<NewsArticle[]> {
    if (await isStale(MARKET_REFRESH_MS)) {
      await this.syncMarketSources().catch((error: unknown) => {
        logger.warn('Market news refresh failed', {
          error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        });
      });
    }
    const items = await NewsRepository.findLatestMarket(limit);
    return items.map(toNewsArticle);
  },

  async getForWatchlist(userId: number, limit = DEFAULT_LIMIT): Promise<NewsArticle[]> {
    if (await isStale(MARKET_REFRESH_MS)) {
      await this.syncMarketSources().catch(() => {});
    }
    const watchlist = await prisma.watchlist.findMany({ where: { userId }, select: { ticker: true } });
    const tickers = watchlist.map(w => w.ticker);
    const items = await NewsRepository.findLatestByWatchlist(tickers, limit);
    return items.map(toNewsArticle);
  },

  async getByTicker(ticker: string, limit = DEFAULT_LIMIT): Promise<NewsArticle[]> {
    const normalizedTicker = ticker.trim().toUpperCase();
    if (!normalizedTicker) return [];
    if (await isStale(TICKER_REFRESH_MS, normalizedTicker)) {
      await this.syncTickerSources(normalizedTicker).catch((error: unknown) => {
        logger.warn('Ticker news refresh failed', {
          ticker: normalizedTicker,
          error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        });
      });
    }
    const items = await NewsRepository.findLatestByTicker(normalizedTicker, limit);
    return items.map(toNewsArticle);
  },

  async getForAnalysis(
    ticker: string,
    companyName?: string,
    limit = ANALYSIS_LIMIT,
    publishedBefore?: Date
  ): Promise<NewsArticle[]> {
    const normalizedTicker = ticker.trim().toUpperCase();
    if (!normalizedTicker) return [];
    const latest = await NewsRepository.findLatestForAi(normalizedTicker, limit, publishedBefore);
    if (latest.length === 0 || await isStale(TICKER_REFRESH_MS, normalizedTicker)) {
      await this.syncTickerSources(normalizedTicker, companyName).catch(() => {});
    }
    const refreshed = await NewsRepository.findLatestForAi(normalizedTicker, limit, publishedBefore);
    return refreshed.map((item) =>
      toNewsArticle({
        ...item,
        tickers: [],
      })
    );
  },

  async cleanupOldNews(): Promise<number> {
    const before = new Date(Date.now() - NEWS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await NewsRepository.deleteOld(before);
    return result.count;
  },
};
