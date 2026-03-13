import { prisma } from '../lib/prisma.ts';
import type { PredictionDir, PredictionTime, PredictionStatus, UserRank } from '@prisma/client';

export type PredictionCreateInput = {
  userId: string;
  ticker: string;
  direction: PredictionDir;
  targetPrice: number;
  priceAtCreation: number;
  timeframe: PredictionTime;
  reason: string | null;
  expiresAt: Date;
  isPublic: boolean;
};

export const PredictionRepository = {
  create(data: PredictionCreateInput) {
    return prisma.prediction.create({
      data: {
        userId: data.userId,
        ticker: data.ticker.toUpperCase(),
        direction: data.direction,
        targetPrice: data.targetPrice,
        priceAtCreation: data.priceAtCreation,
        timeframe: data.timeframe,
        reason: data.reason ?? undefined,
        expiresAt: data.expiresAt,
        isPublic: data.isPublic,
      },
    });
  },

  findById(id: string) {
    return prisma.prediction.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        _count: { select: { likes: true } },
      },
    });
  },

  findOwned(id: string, userId: string) {
    return prisma.prediction.findFirst({
      where: { id, userId },
    });
  },

  delete(id: string) {
    return prisma.prediction.delete({ where: { id } });
  },

  countActiveByUserAndTicker(userId: string, ticker: string) {
    return prisma.prediction.count({
      where: {
        userId,
        ticker: ticker.toUpperCase(),
        status: 'ACTIVE',
      },
    });
  },

  async getFeed(params: {
    viewerId: string;
    filter: 'all' | 'following' | 'top';
    ticker?: string;
    page: number;
    limit: number;
  }) {
    const { viewerId, filter, ticker, page, limit } = params;
    const skip = (page - 1) * limit;

    const followingIds =
      filter === 'following'
        ? (
            await prisma.follow.findMany({
              where: { followerId: viewerId, status: 'ACCEPTED' },
              select: { followingId: true },
            })
          ).map((r) => r.followingId)
        : null;

    const where: Record<string, unknown> = {
      status: 'ACTIVE',
      isPublic: true,
    };
    if (ticker) where.ticker = ticker.toUpperCase();
    if (followingIds !== null) where.userId = { in: followingIds };

    const [items, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              predictionStats: {
                select: {
                  rank: true,
                  accuracyRate: true,
                  totalPredictions: true,
                },
              },
            },
          },
          _count: { select: { likes: true } },
        },
      }),
      prisma.prediction.count({ where }),
    ]);

    const likeRows = await prisma.predictionLike.findMany({
      where: { userId: viewerId, predictionId: { in: items.map((p) => p.id) } },
      select: { predictionId: true },
    });
    const likedSet = new Set(likeRows.map((r) => r.predictionId));

    return {
      items: items.map((p) => ({
        ...p,
        likeCount: p._count.likes,
        isLikedByMe: likedSet.has(p.id),
        userRank: p.user.predictionStats?.rank ?? 'BEGINNER',
        userAccuracyRate: p.user.predictionStats?.accuracyRate ?? 0,
        userTotalPredictions: p.user.predictionStats?.totalPredictions ?? 0,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  getMy(userId: string, status: PredictionStatus | undefined, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where: { userId: string; status?: PredictionStatus } = { userId };
    if (status) where.status = status;

    return prisma.prediction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { likes: true } } },
    });
  },

  getMyCount(userId: string, status?: PredictionStatus) {
    const where: { userId: string; status?: PredictionStatus } = { userId };
    if (status) where.status = status;
    return prisma.prediction.count({ where });
  },

  async getLeaderboard(period: 'alltime' | 'month' | 'week', limit: number) {
    if (period === 'alltime') {
      const rows = await prisma.userPredictionStats.findMany({
        orderBy: { totalPoints: 'desc' },
        take: limit,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
        },
      });
      return rows.map((row, index) => ({
        position: index + 1,
        userId: row.userId,
        totalPoints: row.totalPoints,
        totalPredictions: row.totalPredictions,
        correctPredictions: row.correctPredictions,
        accuracyRate: row.accuracyRate,
        rank: row.rank,
        user: row.user,
      }));
    }
    const since =
      period === 'week'
        ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const aggregated = await prisma.prediction.groupBy({
      by: ['userId'],
      where: {
        resolvedAt: { not: null, gte: since },
        pointsEarned: { not: null },
      },
      _sum: { pointsEarned: true },
    });

    const sorted = aggregated
      .map((a) => ({ userId: a.userId, points: a._sum.pointsEarned ?? 0 }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
    const userIds = sorted.map((s) => s.userId);
    const stats = await prisma.userPredictionStats.findMany({
      where: { userId: { in: userIds } },
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    });
    const statsMap = new Map(stats.map((s) => [s.userId, s]));
    const pointsMap = new Map(sorted.map((s) => [s.userId, s.points]));
    return userIds.map((userId, index) => {
      const s = statsMap.get(userId);
      return {
        position: index + 1,
        userId,
        totalPoints: pointsMap.get(userId) ?? 0,
        totalPredictions: s?.totalPredictions ?? 0,
        correctPredictions: s?.correctPredictions ?? 0,
        accuracyRate: s?.accuracyRate ?? 0,
        rank: s?.rank ?? 'BEGINNER',
        user: s?.user ?? { id: userId, username: null, avatarUrl: null },
      };
    });
  },

  getStatsByUserId(userId: string) {
    return prisma.userPredictionStats.findUnique({
      where: { userId },
    });
  },

  getByTicker(ticker: string) {
    return prisma.prediction.findMany({
      where: { ticker: ticker.toUpperCase(), status: 'ACTIVE', isPublic: true },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            predictionStats: { select: { rank: true, accuracyRate: true, totalPredictions: true } },
          },
        },
        _count: { select: { likes: true } },
      },
    });
  },

  toggleLike(predictionId: string, userId: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.predictionLike.findUnique({
        where: { predictionId_userId: { predictionId, userId } },
      });
      if (existing) {
        await tx.predictionLike.delete({
          where: { predictionId_userId: { predictionId, userId } },
        });
        return false;
      }
      await tx.predictionLike.create({
        data: { predictionId, userId },
      });
      return true;
    });
  },

  getLikeCount(predictionId: string) {
    return prisma.predictionLike.count({ where: { predictionId } });
  },

  isLikedBy(predictionId: string, userId: string) {
    return prisma.predictionLike
      .findUnique({
        where: { predictionId_userId: { predictionId, userId } },
      })
      .then((r) => !!r);
  },

  upsertUserStats(userId: string, data: {
    totalPredictions?: number;
    correctPredictions?: number;
    totalPoints?: number;
    accuracyRate?: number;
    currentStreak?: number;
    bestStreak?: number;
    rank?: UserRank;
  }) {
    return prisma.userPredictionStats.upsert({
      where: { userId },
      create: {
        userId,
        totalPredictions: data.totalPredictions ?? 0,
        correctPredictions: data.correctPredictions ?? 0,
        totalPoints: data.totalPoints ?? 0,
        accuracyRate: data.accuracyRate ?? 0,
        currentStreak: data.currentStreak ?? 0,
        bestStreak: data.bestStreak ?? 0,
        rank: data.rank ?? 'BEGINNER',
      },
      update: data,
    });
  },

  findExpiredActive() {
    return prisma.prediction.findMany({
      where: { status: 'ACTIVE', expiresAt: { lte: new Date() } },
      include: { user: { select: { id: true } } },
    });
  },

  findLikedPredictionIds(userId: string, predictionIds: string[]) {
    if (predictionIds.length === 0) return Promise.resolve([]);
    return prisma.predictionLike
      .findMany({
        where: { userId, predictionId: { in: predictionIds } },
        select: { predictionId: true },
      })
      .then((rows) => rows.map((r) => r.predictionId));
  },

  findByIdForResolution(id: string) {
    return prisma.prediction.findUnique({
      where: { id },
      include: { user: { select: { id: true } } },
    });
  },

  updateResolution(
    id: string,
    data: {
      status: 'HIT' | 'MISSED';
      resolvedPrice: number;
      resolvedAt: Date;
      pointsEarned: number;
      accuracyPct: number;
    }
  ) {
    return prisma.prediction.update({
      where: { id },
      data,
    });
  },
};
