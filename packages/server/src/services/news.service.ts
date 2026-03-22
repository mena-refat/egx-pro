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
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  tickers: string[];
  isMarketWide: boolean;
  source: string;
  url: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// Deduplication helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strips punctuation, collapses whitespace, lowercases.
 * Used as the canonical key for title-based deduplication.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Level 1 — removes duplicates from an in-memory ingestion batch.
 * When two items share the same normalized title, keeps the one
 * with the longer (more informative) summary.
 */
function deduplicateIngested(items: IngestedNews[]): IngestedNews[] {
  const seen = new Map<string, IngestedNews>();
  for (const item of items) {
    const key = normalizeTitle(item.title);
    if (!key) continue;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, item);
    } else {
      const existingLen = existing.summary?.trim().length ?? 0;
      const itemLen = item.summary?.trim().length ?? 0;
      if (itemLen > existingLen) seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}

/**
 * Level 2 — removes duplicates from a DB result set before returning
 * to the API. Guards against articles that were stored before the
 * ingestion-level dedup was in place.
 */
function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Map<string, NewsArticle>();
  for (const article of articles) {
    const key = normalizeTitle(article.title);
    if (!key) continue;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, article);
    } else {
      if ((article.summary?.length ?? 0) > (existing.summary?.length ?? 0)) {
        seen.set(key, article);
      }
    }
  }
  return Array.from(seen.values());
}

// ─────────────────────────────────────────────────────────────────────────────

function computeSentiment(title: string, summary: string): 'positive' | 'negative' | 'neutral' {
  const raw = `${title} ${summary}`.toLowerCase();
  // Strip negation context (e.g. "لا خسائر" / "no loss" → doesn't count as negative)
  const text = raw.replace(/\b(لا|لم|لن|مش|غير|ليس|بدون|no|not|without|avoid|avoids|prevent)\s+\S+/g, ' ');
  const positiveWords = ['أرباح', 'نمو', 'صعود', 'ارتفاع', 'إيجابي', 'توسع', 'تحسن', 'مكاسب', 'profit', 'growth', 'rise', 'gain', 'surge', 'improve', 'record'];
  const negativeWords = ['خسائر', 'هبوط', 'تراجع', 'سلبي', 'انخفاض', 'أزمة', 'ضعف', 'تعثر', 'loss', 'fall', 'decline', 'drop', 'crisis', 'weak', 'default'];
  // Count-based: winner by score, not first match
  const posScore = positiveWords.filter((w) => text.includes(w)).length;
  const negScore = negativeWords.filter((w) => text.includes(w)).length;
  if (posScore > negScore) return 'positive';
  if (negScore > posScore) return 'negative';
  return 'neutral';
}

// Fix 3: key on normalized title only so the same story from different
// sources gets the same externalId and the upsert deduplicates across cycles.
function buildExternalId(title: string): string {
  return createHash('sha256')
    .update(normalizeTitle(title))
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
  publishedAt: Date;
  sentiment: string | null;
  isMarketWide: boolean;
  source: string;
  url: string;
  tickers?: Array<{ ticker: string }>;
}): NewsArticle {
  return {
    title: item.title,
    summary: item.summary ?? '',
    publishedAt: item.publishedAt.toISOString(),
    sentiment: (item.sentiment as NewsArticle['sentiment']) ?? 'neutral',
    tickers: item.tickers?.map((row) => row.ticker) ?? [],
    isMarketWide: item.isMarketWide,
    source: item.source,
    url: item.url,
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
    .flatMap((article) => {
      const title = stripHtml(article.title ?? '').trim();
      if (!title) return [];   // Fix 6: skip whitespace-only titles
      const summary = stripHtml(article.description || article.content || '');
      const tickers = resolveTickers(`${title} ${summary}`, explicitTicker);
      return [{
        externalId: buildExternalId(title),
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
      }];
    });
}

async function fetchGoogleRss(query: string, explicitTicker?: string, isMarketWide = false): Promise<IngestedNews[]> {
  const encoded = encodeURIComponent(query);
  const xml = await fetchText(`https://news.google.com/rss/search?q=${encoded}&hl=ar&gl=EG&ceid=EG:ar`);
  const fetchedAt = new Date();
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  return items.flatMap((item) => {
    const title = stripHtml(pickTag(item, 'title')).trim();
    if (!title) return [];   // Fix 6: skip whitespace-only titles
    const url = pickTag(item, 'link');
    if (!url) return [];
    const summary = stripHtml(pickTag(item, 'description'));
    const publishedAt = pickTag(item, 'pubDate');
    const tickers = resolveTickers(`${title} ${summary}`, explicitTicker);
    return [{
      externalId: buildExternalId(title),
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
    }];
  });
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
        externalId: buildExternalId(title),
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

// Fix 4: key on normalized title only — matches buildExternalId so two sources
// publishing the same story share one cache entry and one AI call.
function ingestCacheKey(title: string): string {
  return 'ai:ingest:' + buildExternalId(title);
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

  // Fix 4 + Fix 8: key uses normalized title; Redis errors are non-fatal
  const key = ingestCacheKey(item.title);
  try {
    const cached = await getCache<{ title: string; summary: string }>(key);
    if (cached) return { ...item, title: cached.title, summary: cached.summary };
  } catch {
    // Redis unavailable — proceed without cache
  }

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

  try {
    await setCache(key, parsed, INGEST_CACHE_TTL_S);
  } catch {
    // Redis unavailable — article is still summarized, just not cached
  }
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

// ── In-flight sync locks — Node.js is single-threaded so the check+set is
// atomic; any concurrent callers (cron + HTTP) get the same Promise ──────────
let _marketSyncInFlight: Promise<number> | null = null;
const _tickerSyncInFlight = new Map<string, Promise<number>>();

export const NewsService = {
  async syncMarketSources(): Promise<number> {
    if (_marketSyncInFlight) return _marketSyncInFlight;
    _marketSyncInFlight = (async () => {
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

    const toIngest = deduplicateIngested([...companyArticles, ...topMarketArticles]);
    const summarized = await summarizeForIngest(toIngest);
    return persist(summarized);
    })().finally(() => { _marketSyncInFlight = null; });
    return _marketSyncInFlight;
  },

  async syncTickerSources(ticker: string, companyName?: string): Promise<number> {
    const normalizedTicker = ticker.trim().toUpperCase();
    const existing = _tickerSyncInFlight.get(normalizedTicker);
    if (existing) return existing;
    const p = (async () => {
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

    const summarized = await summarizeForIngest(deduplicateIngested(merged));
    return persist(summarized);
    })().finally(() => { _tickerSyncInFlight.delete(normalizedTicker); });
    _tickerSyncInFlight.set(normalizedTicker, p);
    return p;
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
    return deduplicateArticles(items.map(toNewsArticle));
  },

  async getForWatchlist(userId: number, limit = DEFAULT_LIMIT): Promise<NewsArticle[]> {
    if (await isStale(MARKET_REFRESH_MS)) {
      await this.syncMarketSources().catch(() => {});
    }
    const watchlist = await prisma.watchlist.findMany({ where: { userId }, select: { ticker: true } });
    const tickers = watchlist.map(w => w.ticker);
    // Empty watchlist → fall back to general market news so the page is never blank
    if (!tickers.length) {
      const items = await NewsRepository.findLatestMarket(limit);
      return deduplicateArticles(items.map(toNewsArticle));
    }
    const items = await NewsRepository.findLatestByWatchlist(tickers, limit);
    return deduplicateArticles(items.map(toNewsArticle));
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
    return deduplicateArticles(items.map(toNewsArticle));
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
    return deduplicateArticles(
      refreshed.map((item) => toNewsArticle({ ...item, tickers: [] }))
    );
  },

  async cleanupOldNews(): Promise<number> {
    const before = new Date(Date.now() - NEWS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await NewsRepository.deleteOld(before);
    return result.count;
  },
};
