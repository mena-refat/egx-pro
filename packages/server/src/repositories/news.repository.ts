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
  async upsertMany(items: NewsUpsertInput[]): Promise<number> {
    let count = 0;
    for (const item of items) {
      const tickers = Array.from(new Set(item.tickers.map((ticker) => ticker.trim().toUpperCase()).filter(Boolean)));
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
            ? {
                create: tickers.map((ticker) => ({
                  ticker,
                })),
              }
            : undefined,
        },
        update: {
          title: item.title,
          summary: item.summary ?? undefined,
          source: item.source,
          url: item.url,
          publishedAt: item.publishedAt,
          fetchedAt: item.fetchedAt,
          isMarketWide: item.isMarketWide,
          language: item.language ?? undefined,
          sentiment: item.sentiment ?? undefined,
          tickers: {
            deleteMany: {},
            ...(tickers.length > 0
              ? {
                  create: tickers.map((ticker) => ({
                    ticker,
                  })),
                }
              : {}),
          },
        },
      });
      count += 1;
    }
    return count;
  },

  findLatestMarket(limit: number) {
    return prisma.newsItem.findMany({
      include: newsInclude,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  },

  findLatestByWatchlist(tickers: string[], limit: number) {
    if (!tickers.length) return Promise.resolve([]);
    return prisma.newsItem.findMany({
      where: {
        OR: [
          { isMarketWide: true },
          { tickers: { some: { ticker: { in: tickers.map(t => t.toUpperCase()) } } } },
        ],
      },
      include: newsInclude,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  },

  findLatestByTicker(ticker: string, limit: number) {
    return prisma.newsItem.findMany({
      where: {
        OR: [
          { isMarketWide: true },
          { tickers: { some: { ticker: ticker.toUpperCase() } } },
        ],
      },
      include: newsInclude,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  },

  findLatestForAi(ticker: string, limit: number, publishedBefore?: Date) {
    return prisma.newsItem.findMany({
      where: {
        ...(publishedBefore ? { publishedAt: { lte: publishedBefore } } : {}),
        OR: [
          { tickers: { some: { ticker: ticker.toUpperCase() } } },
          { isMarketWide: true },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  },

  getLatestFetchedAt(sourceType?: NewsSourceType, ticker?: string) {
    return prisma.newsItem.findFirst({
      where: {
        ...(sourceType ? { sourceType } : {}),
        ...(ticker
          ? {
              OR: [
                { tickers: { some: { ticker: ticker.toUpperCase() } } },
                { isMarketWide: true },
              ],
            }
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
