import { AppError } from '../lib/errors.ts';
import { createNotification } from '../lib/createNotification.ts';
import { getStockPrice } from '../lib/stockData.ts';
import { incrWithExpire, getCount, decrCount } from '../lib/redis.ts';
import { getCairoDateString, getCairoDateStringFromDate, getCairoMidnightExpirySeconds } from '../lib/cairo-date.ts';
import { PREDICTION_LIMITS } from '../lib/constants.ts';
import { isPaid } from '../lib/plan.ts';
import { prisma } from '../lib/prisma.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import { PredictionRepository } from '../repositories/prediction.repository.ts';
import type { PredictionDir, PredictionTime, UserRank } from '@prisma/client';

const DAILY_KEY_PREFIX = 'predictions:daily:';
const DELETION_WINDOW_MS = PREDICTION_LIMITS.deletionWindowMinutes * 60 * 1000;
const MIN_ACCOUNT_AGE_MS = PREDICTION_LIMITS.minAccountAgeHours * 60 * 60 * 1000;
const MIN_MOVE_PCT = 0.5;
const MAX_MOVE_PCT = 100;

function getExpiresAt(timeframe: PredictionTime): Date {
  const now = new Date();
  switch (timeframe) {
    case 'WEEK':
      now.setDate(now.getDate() + 7);
      break;
    case 'MONTH':
      now.setMonth(now.getMonth() + 1);
      break;
    case 'THREE_MONTHS':
      now.setMonth(now.getMonth() + 3);
      break;
    case 'SIX_MONTHS':
      now.setMonth(now.getMonth() + 6);
      break;
    case 'NINE_MONTHS':
      now.setMonth(now.getMonth() + 9);
      break;
    case 'YEAR':
      now.setFullYear(now.getFullYear() + 1);
      break;
    default:
      now.setDate(now.getDate() + 7);
  }
  return now;
}

function validateTargetPrice(
  direction: PredictionDir,
  targetPrice: number,
  priceAtCreation: number
): void {
  if (priceAtCreation <= 0) {
    throw new AppError(
      'PRICE_UNAVAILABLE',
      400,
      'السعر الحالي غير صالح',
      { messageAr: 'السعر الحالي غير صالح' }
    );
  }
  const movePct = ((targetPrice - priceAtCreation) / priceAtCreation) * 100;
  if (direction === 'UP') {
    if (movePct < MIN_MOVE_PCT) {
      throw new AppError(
        'TARGET_PRICE_INVALID',
        400,
        'السعر المستهدف يجب أن يكون أعلى من السعر الحالي للتوقع بالصعود (على الأقل 0.5٪)',
        { messageAr: 'السعر المستهدف يجب أن يكون أعلى من السعر الحالي للتوقع بالصعود (على الأقل 0.5٪)' }
      );
    }
  } else {
    if (movePct > -MIN_MOVE_PCT) {
      throw new AppError(
        'TARGET_PRICE_INVALID',
        400,
        'السعر المستهدف يجب أن يكون أقل من السعر الحالي للتوقع بالهبوط (على الأقل 0.5٪)',
        { messageAr: 'السعر المستهدف يجب أن يكون أقل من السعر الحالي للتوقع بالهبوط (على الأقل 0.5٪)' }
      );
    }
  }
  if (Math.abs(movePct) > MAX_MOVE_PCT) {
    throw new AppError(
      'TARGET_PRICE_INVALID',
      400,
      'التغيير المتوقع كبير جداً (أكثر من 100٪)',
      { messageAr: 'التغيير المتوقع كبير جداً (أكثر من 100٪)' }
    );
  }
}

function computeRank(stats: {
  totalPredictions: number;
  accuracyRate: number;
}): UserRank {
  const { totalPredictions, accuracyRate } = stats;
  if (totalPredictions >= 200 && accuracyRate >= 80) return 'LEGEND';
  if (totalPredictions >= 100 && accuracyRate >= 75) return 'EXPERT';
  if (totalPredictions >= 50 && accuracyRate >= 65) return 'SENIOR';
  if (totalPredictions >= 20 && accuracyRate >= 50) return 'ANALYST';
  return 'BEGINNER';
}

export const PredictionsService = {
  async getDailyLimit(user: { plan?: string | null; planExpiresAt?: Date | null; referralProExpiresAt?: Date | null }): Promise<number> {
    return isPaid(user) ? PREDICTION_LIMITS.proDaily : PREDICTION_LIMITS.freeDaily;
  },

  async getDailyUsed(userId: string): Promise<number> {
    const dateStr = getCairoDateString();
    const key = `${DAILY_KEY_PREFIX}${userId}:${dateStr}`;
    const n = await getCount(key);
    return Math.max(0, n);
  },

  async getLimits(userId: string, user: { plan?: string | null; planExpiresAt?: Date | null; referralProExpiresAt?: Date | null }) {
    const limit = await this.getDailyLimit(user);
    const used = await this.getDailyUsed(userId);
    const midnightSec = getCairoMidnightExpirySeconds();
    const resetsAt = new Date(midnightSec * 1000).toISOString();
    return { used, limit, resetsAt };
  },

  async create(
    userId: string,
    user: { plan?: string | null; planExpiresAt?: Date | null; referralProExpiresAt?: Date | null; createdAt?: Date },
    body: {
      ticker: string;
      direction: PredictionDir;
      targetPrice: number;
      timeframe: PredictionTime;
      reason?: string | null;
      isPublic?: boolean;
    }
  ) {
    const ticker = String(body.ticker || '').trim().toUpperCase();
    const direction = body.direction as PredictionDir;
    const targetPrice = Number(body.targetPrice);
    const timeframe = (body.timeframe || 'WEEK') as PredictionTime;
    const rawReason = typeof body.reason === 'string' ? body.reason : '';
    const isPublic = body.isPublic !== false;

    if (!ticker || !['UP', 'DOWN'].includes(direction) || !['WEEK', 'MONTH', 'THREE_MONTHS'].includes(timeframe)) {
      throw new AppError('VALIDATION_ERROR', 400, 'بيانات غير صالحة');
    }
    if (typeof targetPrice !== 'number' || targetPrice <= 0) {
      throw new AppError('TARGET_PRICE_INVALID', 400, 'السعر المستهدف غير صالح');
    }

    const trimmedReason = rawReason.trim();
    if (!trimmedReason) {
      throw new AppError('VALIDATION_ERROR', 400, 'يرجى كتابة سبب توقعك');
    }
    const wordCount = trimmedReason.split(/\s+/).filter(Boolean).length;
    if (wordCount < 10) {
      throw new AppError(
        'VALIDATION_ERROR',
        400,
        'السبب قصير جداً — اكتب على الأقل 10 كلمات توضح رأيك',
        { wordCount, required: 10 }
      );
    }
    if (trimmedReason.length > 500) {
      throw new AppError('VALIDATION_ERROR', 400, 'السبب طويل جداً (الحد الأقصى 500 حرف)');
    }

    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    if (accountAge < MIN_ACCOUNT_AGE_MS) {
      throw new AppError(
        'ACCOUNT_TOO_NEW',
        403,
        'يجب أن يكون عمر الحساب 24 ساعة على الأقل لإنشاء توقعات'
      );
    }

    const dailyLimit = await this.getDailyLimit(user);
    const dateStr = getCairoDateString();
    const dailyKey = `${DAILY_KEY_PREFIX}${userId}:${dateStr}`;
    const used = Math.max(0, await getCount(dailyKey));
    if (used >= dailyLimit) {
      throw new AppError(
        'DAILY_LIMIT_EXCEEDED',
        429,
        `تم استهلاك حد التوقعات اليومي (${dailyLimit}). يتم إعادة التعيين عند منتصف الليل بتوقيت القاهرة.`
      );
    }

    const activeSameTicker = await PredictionRepository.countActiveByUserAndTicker(userId, ticker);
    if (activeSameTicker > 0) {
      throw new AppError(
        'DUPLICATE_ACTIVE_PREDICTION',
        409,
        'لديك توقع نشط بالفعل على هذا السهم'
      );
    }

    const priceData = await getStockPrice(ticker);
    if (!priceData || typeof priceData.price !== 'number') {
      throw new AppError(
        'PRICE_UNAVAILABLE',
        503,
        'السعر غير متوفر حالياً. حاول لاحقاً.'
      );
    }
    const priceAtCreation = priceData.price;
    validateTargetPrice(direction, targetPrice, priceAtCreation);

    const expiresAt = getExpiresAt(timeframe);
    const prediction = await PredictionRepository.create({
      userId,
      ticker,
      direction,
      targetPrice,
      priceAtCreation,
      timeframe,
      reason: trimmedReason,
      expiresAt,
      isPublic,
    });

    await incrWithExpire(dailyKey, getCairoMidnightExpirySeconds());
    return prediction;
  },

  async delete(userId: string, predictionId: string) {
    const prediction = await PredictionRepository.findOwned(predictionId, userId);
    if (!prediction) {
      throw new AppError('NOT_FOUND', 404, 'التوقع غير موجود أو لا تملك صلاحية حذفه');
    }
    const elapsed = Date.now() - prediction.createdAt.getTime();
    if (elapsed > DELETION_WINDOW_MS) {
      throw new AppError(
        'DELETE_WINDOW_EXPIRED',
        403,
        'لا يمكن حذف التوقع بعد مرور 5 دقائق من إنشائه'
      );
    }
    const dateStr = getCairoDateStringFromDate(prediction.createdAt);
    const dailyKey = `${DAILY_KEY_PREFIX}${userId}:${dateStr}`;
    await PredictionRepository.delete(predictionId);
    await decrCount(dailyKey);
  },

  async getFeed(viewerId: string, filter: 'all' | 'following' | 'top', ticker: string | undefined, page: number, limit: number) {
    const data = await PredictionRepository.getFeed({
      viewerId,
      filter,
      ticker,
      page: filter === 'top' ? 1 : page,
      limit: filter === 'top' ? Math.min(100, limit * 5) : limit,
    });
    if (filter === 'top') {
      const sorted = [...data.items].sort((a, b) => (b.userAccuracyRate ?? 0) - (a.userAccuracyRate ?? 0));
      const start = (page - 1) * limit;
      data.items = sorted.slice(start, start + limit);
      data.pagination.total = sorted.length;
      data.pagination.totalPages = Math.ceil(sorted.length / limit);
    }
    return data;
  },

  async getMy(userId: string, status: string | undefined, page: number, limit: number) {
    const statusVal = status && ['ACTIVE', 'HIT', 'MISSED', 'EXPIRED'].includes(status) ? (status as 'ACTIVE' | 'HIT' | 'MISSED' | 'EXPIRED') : undefined;
    const items = await PredictionRepository.getMy(userId, statusVal, page, limit);
    const total = await PredictionRepository.getMyCount(userId, statusVal);
    const likeRows = await prisma.predictionLike.findMany({
      where: { userId, predictionId: { in: items.map((p) => p.id) } },
      select: { predictionId: true },
    });
    const likedSet = new Set(likeRows.map((r) => r.predictionId));
    return {
      items: items.map((p) => ({
        ...p,
        likeCount: p._count.likes,
        isLikedByMe: likedSet.has(p.id),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getLeaderboard(period: 'alltime' | 'month' | 'week', limit: number) {
    return PredictionRepository.getLeaderboard(period, limit);
  },

  async getStatsByUsername(username: string, viewerId: string) {
    const user = await UserRepository.findUnique({
      where: { username },
      select: { id: true, isPrivate: true, predictionStats: true },
    });
    if (!user) throw new AppError('NOT_FOUND', 404, 'المستخدم غير موجود');
    const stats = user.predictionStats;
    if (!stats) {
      return { rank: 'BEGINNER' as UserRank, totalPredictions: 0, private: false };
    }
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: viewerId, followingId: user.id },
      },
    });
    const isFollowing = follow?.status === 'ACCEPTED';
    const isOwn = viewerId === user.id;
    const canSeeFull = isOwn || !user.isPrivate || isFollowing;
    if (!canSeeFull) {
      return {
        rank: stats.rank,
        totalPredictions: stats.totalPredictions,
        private: true,
      };
    }
    return {
      ...stats,
      private: false,
    };
  },

  async getByTicker(ticker: string, viewerId: string) {
    const list = await PredictionRepository.getByTicker(ticker);
    const likeRows = await prisma.predictionLike.findMany({
      where: { userId: viewerId, predictionId: { in: list.map((p) => p.id) } },
      select: { predictionId: true },
    });
    const likedSet = new Set(likeRows.map((r) => r.predictionId));
    const upCount = list.filter((p) => p.direction === 'UP').length;
    const downCount = list.filter((p) => p.direction === 'DOWN').length;
    const sorted = [...list].sort((a, b) => {
      const aAcc = a.user.predictionStats?.accuracyRate ?? 0;
      const bAcc = b.user.predictionStats?.accuracyRate ?? 0;
      return bAcc - aAcc;
    });
    return {
      upCount,
      downCount,
      predictions: sorted.map((p) => ({
        ...p,
        likeCount: p._count.likes,
        isLikedByMe: likedSet.has(p.id),
      })),
    };
  },

  async toggleLike(predictionId: string, userId: string) {
    const prediction = await PredictionRepository.findById(predictionId);
    if (!prediction) throw new AppError('NOT_FOUND', 404, 'التوقع غير موجود');
    if (prediction.userId === userId) {
      throw new AppError('SELF_LIKE_FORBIDDEN', 403, 'لا يمكن الإعجاب بتوقعك الخاص');
    }
    const liked = await PredictionRepository.toggleLike(predictionId, userId);
    if (liked) {
      const liker = await UserRepository.findUnique({
        where: { id: userId },
        select: { username: true },
      });
      const likerName = liker?.username ? `${liker.username}` : 'مستخدم';
      await createNotification(
        prediction.userId,
        'prediction_liked',
        'إعجاب بتوقعك',
        `${likerName} أعجبه توقعك على ${prediction.ticker}`,
        { route: '/predictions' }
      );
    }
    return liked;
  },

  async resolveAndScore(predictionId: string, resolvedPrice: number) {
    const prediction = await prisma.prediction.findUnique({
      where: { id: predictionId },
      include: { user: { select: { id: true } } },
    });
    if (!prediction || prediction.status !== 'ACTIVE') return;
    const target = prediction.targetPrice;
    const direction = prediction.direction;
    const movePct = Math.abs((resolvedPrice - prediction.priceAtCreation) / prediction.priceAtCreation) * 100;
    const targetMovePct = Math.abs((target - prediction.priceAtCreation) / prediction.priceAtCreation) * 100;
    const diffPct = Math.abs(resolvedPrice - target) / target * 100;

    let basePoints = 0;
    const hitWithin1 = diffPct <= 1;
    const hitWithin3 = diffPct <= 3;
    const hitWithin5 = diffPct <= 5;
    const directionCorrect =
      (direction === 'UP' && resolvedPrice >= prediction.priceAtCreation) ||
      (direction === 'DOWN' && resolvedPrice <= prediction.priceAtCreation);

    if (hitWithin1) basePoints = 100;
    else if (hitWithin3) basePoints = 70;
    else if (hitWithin5) basePoints = 40;
    else if (directionCorrect) basePoints = 10;
    else basePoints = -10;

    let multiplier = 1;
    if (prediction.timeframe === 'THREE_MONTHS') multiplier *= 1.5;
    else if (prediction.timeframe === 'MONTH') multiplier *= 1.2;
    if (targetMovePct > 30) multiplier *= 2;
    else if (targetMovePct > 15) multiplier *= 1.5;

    let pointsEarned = basePoints >= 0 ? Math.floor(basePoints * multiplier) : basePoints;
    if (pointsEarned < 0) pointsEarned = Math.max(-10, Math.floor(pointsEarned));
    else pointsEarned = Math.max(0, pointsEarned);

    const accuracyPct = Math.min(100, Math.max(0, 100 - diffPct));
    const targetReached =
      (direction === 'UP' && resolvedPrice >= target) ||
      (direction === 'DOWN' && resolvedPrice <= target);
    const status = targetReached ? 'HIT' : 'MISSED';

    await prisma.prediction.update({
      where: { id: predictionId },
      data: {
        status,
        resolvedPrice,
        resolvedAt: new Date(),
        pointsEarned,
        accuracyPct,
      },
    });

    const stats = await PredictionRepository.getStatsByUserId(prediction.userId);
    const totalPredictions = (stats?.totalPredictions ?? 0) + 1;
    const correctPredictions = (stats?.correctPredictions ?? 0) + (status === 'HIT' ? 1 : 0);
    const totalPoints = (stats?.totalPoints ?? 0) + pointsEarned;
    const accuracyRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
    const currentStreak = status === 'HIT' ? (stats?.currentStreak ?? 0) + 1 : 0;
    const bestStreak = Math.max(stats?.bestStreak ?? 0, currentStreak);
    const rank = computeRank({ totalPredictions, accuracyRate });

    const oldRank = stats?.rank;
    await PredictionRepository.upsertUserStats(prediction.userId, {
      totalPredictions,
      correctPredictions,
      totalPoints,
      accuracyRate,
      currentStreak,
      bestStreak,
      rank,
    });

    if (oldRank !== rank) {
      const rankLabels: Record<UserRank, string> = {
        BEGINNER: 'مبتدئ',
        ANALYST: 'محلل',
        SENIOR: 'محلل متقدم',
        EXPERT: 'خبير',
        LEGEND: 'أسطورة',
      };
      await createNotification(
        prediction.userId,
        'rank_up',
        'تهانينا! ارتقيت إلى رتبة جديدة',
        `🏆 ارتقيت إلى رتبة ${rankLabels[rank] ?? rank}`,
        { route: '/predictions' }
      );
    }

    return { status, pointsEarned, userId: prediction.userId };
  },
};
