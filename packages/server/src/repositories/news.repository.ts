import type { NewsSourceType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.ts';

type NewsUpsertInput = {
  externalId: string;
  title: string;
  summary?: string | null;
  source: string;
  sourceType: NewsSourceType;
  url: string;
  publishedAt: Date;
  fetchedAt: Date;
  isMarketWide: boolean;
  language?: string | null;
  sentiment?: string | null;
  tickers: string[];
};

const newsInclude = {
  tickers: {
    select: { ticker: true },
  },
} satisfies Prisma.NewsItemInclude;

export const NewsRepository = {
  // Fix 5: run upserts in parallel batches of 10 instead of sequentially
  async upsertMany(items: NewsUpsertInput[]): Promise<number> {
    if (!items.length) return 0;
    const BATCH = 10;
    let count = 0;
    for (let i = 0; i < items.length; i += BATCH) {
      const chunk = items.slice(i, i + BATCH);
      await Promise.all(chunk.map(async (item) => {
        const tickers = Array.from(new Set(item.tickers.map((t) => t.trim().toUpperCase()).filter(Boolean)));
        await prisma.newsItem.upsert({
          where: { externalId: item.externalId },
          create: {
            externalId: item.externalId,
            title: item.title,
            summary: item.summary ?? undefined,
            source: item.source,
            sourceType: item.sourceType,
            url: item.url,
            publishedAt: item.publishedAt,
            fetchedAt: item.fetchedAt,
            isMarketWide: item.isMarketWide,
            language: item.language ?? undefined,
            sentiment: item.sentiment ?? undefined,
            tickers: tickers.length > 0
              ? { create: tickers.map((ticker) => ({ ticker })) }
              : undefined,
          },
          update: {
            title: item.title,
            summary: item.summary ?? undefined,
            source: item.source,
            sourceType: item.sourceType,
            url: item.url,
            publishedAt: item.publishedAt,
            fetchedAt: item.fetchedAt,
            isMarketWide: item.isMarketWide,
            language: item.language ?? undefined,
            sentiment: item.sentiment ?? undefined,
            tickers: {
              deleteMany: {},
              ...(tickers.length > 0
                ? { create: tickers.map((ticker) => ({ ticker })) }
                : {}),
            },
          },
        });
      }));
      count += chunk.length;
    }
    return count;
  },

  // Fix 1: only market-wide articles for the market feed
  findLatestMarket(limit: number) {
    return prisma.newsItem.findMany({
      where: { isMarketWide: true },
      include: newsInclude,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  },

  // Fix 4: ticker-specific articles first, fill remainder with market-wide
  async findLatestByWatchlist(tickers: string[], limit: number) {
    if (!tickers.length) return [];
    const upper = tickers.map(t => t.toUpperCase());
    const tickerArticles = await prisma.newsItem.findMany({
      where: { tickers: { some: { ticker: { in: upper } } } },
      include: newsInclude,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
    const remaining = limit - tickerArticles.length;
    if (remaining <= 0) return tickerArticles;
    const usedIds = tickerArticles.map(a => a.id);
    const marketArticles = await prisma.newsItem.findMany({
      where: {
        isMarketWide: true,
        ...(usedIds.length > 0 ? { id: { notIn: usedIds } } : {}),
      },
      include: newsInclude,
      orderBy: { publishedAt: 'desc' },
      take: remaining,
    });
    return [...tickerArticles, ...marketArticles].sort(
      (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
    );
  },

  // Fix 4: ticker-specific articles first, fill remainder with market-wide
  async findLatestByTicker(ticker: string, limit: number) {
    const upper = ticker.toUpperCase();
    const tickerArticles = await prisma.newsItem.findMany({
      where: { tickers: { some: { ticker: upper } } },
      include: newsInclude,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
    const remaining = limit - tickerArticles.length;
    if (remaining <= 0) return tickerArticles;
    const usedIds = tickerArticles.map(a => a.id);
    const marketArticles = await prisma.newsItem.findMany({
      where: {
        isMarketWide: true,
        ...(usedIds.length > 0 ? { id: { notIn: usedIds } } : {}),
      },
      include: newsInclude,
      orderBy: { publishedAt: 'desc' },
      take: remaining,
    });
    return [...tickerArticles, ...marketArticles].sort(
      (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
    );
  },

  // Fix 3: only ticker-specific news for AI analysis — market-wide noise
  // dilutes the signal and wastes tokens on irrelevant context.
  findLatestForAi(ticker: string, limit: number, publishedBefore?: Date) {
    return prisma.newsItem.findMany({
      where: {
        tickers: { some: { ticker: ticker.toUpperCase() } },
        ...(publishedBefore ? { publishedAt: { lte: publishedBefore } } : {}),
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  },

  // Fix 2: when checking staleness for a ticker, only look at ticker-specific
  // articles — not market-wide ones — so ticker news refreshes independently.
  getLatestFetchedAt(sourceType?: NewsSourceType, ticker?: string) {
    return prisma.newsItem.findFirst({
      where: {
        ...(sourceType ? { sourceType } : {}),
        ...(ticker
          ? { tickers: { some: { ticker: ticker.toUpperCase() } } }
          : {}),
      },
      orderBy: { fetchedAt: 'desc' },
      select: { fetchedAt: true },
    });
  },

  countMarketWideSince(since: Date): Promise<number> {
    return prisma.newsItem.count({
      where: { isMarketWide: true, publishedAt: { gte: since } },
    });
  },

  deleteOld(before: Date) {
    return prisma.newsItem.deleteMany({
      where: { publishedAt: { lt: before } },
    });
  },
};
