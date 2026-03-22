import { AppError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';
import { createNotification } from '../lib/createNotification.ts';
import { getStockPrice } from '../lib/stockData.ts';
import { incrWithExpire, getCount, decrCount } from '../lib/redis.ts';
import { getCairoDateString, getCairoDateStringFromDate, getCairoMidnightExpirySeconds } from '../lib/cairo-date.ts';
import { PREDICTION_LIMITS } from '../lib/constants.ts';
import { isPaid, isPro, isUltra } from '../lib/plan.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import { PredictionRepository } from '../repositories/prediction.repository.ts';
import { FollowRepository } from '../repositories/follow.repository.ts';
import type { PredictionDir, PredictionTime, MoveTier, PredictionMode, UserRank } from '@prisma/client';

const DAILY_KEY_PREFIX = 'predictions:daily:';
const DELETION_WINDOW_MS = PREDICTION_LIMITS.deletionWindowMinutes * 60 * 1000;
const MIN_ACCOUNT_AGE_MS = PREDICTION_LIMITS.minAccountAgeHours * 60 * 60 * 1000;

// ─── Move Tier Definitions ────────────────────────────────────────────────────
// Calibrated to EGX 40-year history (1986-2024):
//   • Individual stock annualized volatility: ~55% (vs index ~26%)
//   • Daily limit ±10%, can exceed after suspension/IPO (absolute ±20%)
//   • Tier ranges are timeframe-specific so difficulty is equal across all durations
//   • Basis: σ_t = 55% × √(T/252), tiers at 0-0.5σ / 0.5-1.5σ / 1.5-2.5σ / >2.5σ

export interface TierDef {
  basePoints: number;
  labelAr:    string;
  labelEn:    string;
}

export const TIER_DEFS: Record<MoveTier, TierDef> = {
  LIGHT:   { basePoints: 25,  labelAr: 'خفيف',   labelEn: 'Light'   },
  MEDIUM:  { basePoints: 55,  labelAr: 'متوسط',  labelEn: 'Medium'  },
  STRONG:  { basePoints: 100, labelAr: 'قوي',    labelEn: 'Strong'  },
  EXTREME: { basePoints: 160, labelAr: 'متطرف',  labelEn: 'Extreme' },
};

// Timeframe-specific tier ranges [min%, max%) calibrated to EGX volatility.
// Each tier represents roughly the same probability band at every timeframe.
const TIMEFRAME_TIER_RANGES: Record<PredictionTime, Record<MoveTier, [number, number]>> = {
  WEEK:         { LIGHT: [1, 5],   MEDIUM: [5, 11],  STRONG: [11, 19],  EXTREME: [19, Infinity] },
  MONTH:        { LIGHT: [1, 8],   MEDIUM: [8, 25],  STRONG: [25, 40],  EXTREME: [40, Infinity] },
  THREE_MONTHS: { LIGHT: [1, 15],  MEDIUM: [15, 40], STRONG: [40, 70],  EXTREME: [70, Infinity] },
  SIX_MONTHS:   { LIGHT: [2, 20],  MEDIUM: [20, 60], STRONG: [60, 95],  EXTREME: [95, Infinity] },
  NINE_MONTHS:  { LIGHT: [2, 25],  MEDIUM: [25, 70], STRONG: [70, 120], EXTREME: [120, Infinity] },
  YEAR:         { LIGHT: [3, 28],  MEDIUM: [28, 82], STRONG: [82, 135], EXTREME: [135, Infinity] },
};

// Timeframe multipliers — reward long-term commitment (difficulty already baked into ranges).
const TIMEFRAME_MULTIPLIER: Record<PredictionTime, number> = {
  WEEK:         1.0,
  MONTH:        1.3,
  THREE_MONTHS: 1.8,
  SIX_MONTHS:   2.4,
  NINE_MONTHS:  3.0,
  YEAR:         4.0,
};

const MISS_POINTS = -8;  // Wrong direction (TIER mode)

// Tier order for adjacency calculation
const TIER_ORDER: MoveTier[] = ['LIGHT', 'MEDIUM', 'STRONG', 'EXTREME'];

// ─── EXACT Mode Scoring ────────────────────────────────────────────────────────
// Tolerance bands: [tolerance%, base points, accuracyPct]
// Higher base than TIER because predicting an exact price is far harder.
const EXACT_BANDS: Array<[number, number, number]> = [
  [2,  500, 100],  // ±2%  → دقة تامة (Bullseye)
  [5,  350,  70],  // ±5%  → دقيق جداً (Sharp)
  [10, 200,  40],  // ±10% → دقيق (Precise)
  [20,  90,  18],  // ±20% → قريب (Close)
];
const EXACT_FAR_POINTS = 25;    // Direction right but >20% off
const EXACT_MISS_POINTS = -15;  // Wrong direction (higher penalty for EXACT)

// Days-to-expiry multiplier for EXACT mode
function exactDaysMultiplier(createdAt: Date, expiresAt: Date): number {
  const days = Math.round((expiresAt.getTime() - createdAt.getTime()) / 86_400_000);
  if (days <= 7)   return 1.0;
  if (days <= 30)  return 1.5;
  if (days <= 90)  return 2.2;
  if (days <= 180) return 3.0;
  if (days <= 365) return 4.5;
  return 6.0;
}

function scoreExact(
  targetPrice: number,
  resolvedPrice: number,
  priceAtCreation: number,
  createdAt: Date,
  expiresAt: Date
): { basePoints: number; multiplier: number; accuracyPct: number; status: 'HIT' | 'MISSED' } {
  const directionUp = targetPrice > priceAtCreation;
  const directionCorrect =
    (directionUp  && resolvedPrice > priceAtCreation) ||
    (!directionUp && resolvedPrice < priceAtCreation);

  if (!directionCorrect) {
    return { basePoints: EXACT_MISS_POINTS, multiplier: 1, accuracyPct: 0, status: 'MISSED' };
  }

  const diffPct = Math.abs((resolvedPrice - targetPrice) / targetPrice) * 100;
  const mult    = exactDaysMultiplier(createdAt, expiresAt);

  for (const [band, pts, accuracy] of EXACT_BANDS) {
    if (diffPct <= band) {
      return { basePoints: pts, multiplier: mult, accuracyPct: accuracy, status: 'HIT' };
    }
  }

  return { basePoints: EXACT_FAR_POINTS, multiplier: mult, accuracyPct: 5, status: 'HIT' };
}

function getTierForMove(absPct: number, timeframe: PredictionTime): MoveTier | 'FLAT' {
  const ranges = TIMEFRAME_TIER_RANGES[timeframe];
  if (absPct < ranges.LIGHT[0]) return 'FLAT';
  for (const tier of TIER_ORDER) {
    const [min, max] = ranges[tier];
    if (absPct >= min && absPct < max) return tier;
  }
  return 'EXTREME';
}

function getExpiresAt(timeframe: PredictionTime): Date {
  const now = new Date();
  switch (timeframe) {
    case 'WEEK':          now.setDate(now.getDate() + 7);        break;
    case 'MONTH':         now.setMonth(now.getMonth() + 1);      break;
    case 'THREE_MONTHS':  now.setMonth(now.getMonth() + 3);      break;
    case 'SIX_MONTHS':    now.setMonth(now.getMonth() + 6);      break;
    case 'NINE_MONTHS':   now.setMonth(now.getMonth() + 9);      break;
    case 'YEAR':          now.setFullYear(now.getFullYear() + 1); break;
    default:              now.setDate(now.getDate() + 7);
  }
  return now;
}

function computeRank(stats: { totalPredictions: number; accuracyRate: number }): UserRank {
  const { totalPredictions, accuracyRate } = stats;
  if (totalPredictions >= 200 && accuracyRate >= 80) return 'LEGEND';
  if (totalPredictions >= 100 && accuracyRate >= 75) return 'EXPERT';
  if (totalPredictions  >= 50 && accuracyRate >= 65) return 'SENIOR';
  if (totalPredictions  >= 20 && accuracyRate >= 50) return 'ANALYST';
  return 'BEGINNER';
}

export const PredictionsService = {
  async getDailyLimit(user: { plan?: string | null; planExpiresAt?: Date | null; referralProExpiresAt?: Date | null }): Promise<number> {
    if (isUltra(user)) return PREDICTION_LIMITS.ultraDaily;
    if (isPaid(user))  return PREDICTION_LIMITS.proDaily;
    return PREDICTION_LIMITS.freeDaily;
  },

  async getMaxActive(user: { plan?: string | null; planExpiresAt?: Date | null; referralProExpiresAt?: Date | null }): Promise<number> {
    if (isUltra(user)) return PREDICTION_LIMITS.ultraMaxActive;
    if (isPaid(user))  return PREDICTION_LIMITS.proMaxActive;
    return PREDICTION_LIMITS.freeMaxActive;
  },

  async getDailyUsed(userId: number): Promise<number> {
    const key = `${DAILY_KEY_PREFIX}${userId}:${getCairoDateString()}`;
    return Math.max(0, await getCount(key));
  },

  async getLimits(userId: number, user: { plan?: string | null; planExpiresAt?: Date | null; referralProExpiresAt?: Date | null }) {
    const [dailyLimit, used, activeLimit, activeUsed] = await Promise.all([
      this.getDailyLimit(user),
      this.getDailyUsed(userId),
      this.getMaxActive(user),
      PredictionRepository.countActiveByUser(userId),
    ]);
    const midnightSec = getCairoMidnightExpirySeconds();
    return {
      used,
      limit: dailyLimit,
      activeUsed,
      activeLimit,
      resetsAt: new Date(midnightSec * 1000).toISOString(),
    };
  },

  async create(
    userId:  number,
    user:    { plan?: string | null; planExpiresAt?: Date | null; referralProExpiresAt?: Date | null; createdAt?: Date },
    body:    {
      ticker:       string;
      mode?:        'TIER' | 'EXACT';
      // TIER mode
      direction?:   'UP' | 'DOWN';
      moveTier?:    MoveTier;
      timeframe?:   PredictionTime;
      // EXACT mode
      targetPrice?: number;
      expiresAt?:   string; // ISO date string from client (EXACT mode only)
      reason?:      string | null;
      isPublic?:    boolean;
    }
  ) {
    const ticker   = String(body.ticker || '').trim().toUpperCase();
    const mode     = (body.mode === 'EXACT' ? 'EXACT' : 'TIER') as PredictionMode;
    const rawReason = typeof body.reason === 'string' ? body.reason : '';
    const isPublic  = body.isPublic !== false;

    if (!ticker) throw new AppError('VALIDATION_ERROR', 400, 'الرمز المالي مطلوب');

    // ── EXACT mode: Pro/Ultra only ────────────────────────────────────────────
    if (mode === 'EXACT' && !isPaid(user)) {
      throw new AppError('FORBIDDEN', 403, 'وضع السعر المحدد متاح فقط لمشتركي Pro و Ultra');
    }

    const validTimeframes: PredictionTime[] = ['WEEK', 'MONTH', 'THREE_MONTHS', 'SIX_MONTHS', 'NINE_MONTHS', 'YEAR'];
    const validTiers:      MoveTier[]       = ['LIGHT', 'MEDIUM', 'STRONG', 'EXTREME'];

    let direction:   PredictionDir;
    let moveTier:    MoveTier | undefined;
    let timeframe:   PredictionTime | undefined;
    let targetPrice: number | undefined;
    let expiresAt:   Date;

    if (mode === 'TIER') {
      direction = body.direction as PredictionDir;
      moveTier  = body.moveTier  as MoveTier;
      timeframe = (body.timeframe || 'WEEK') as PredictionTime;

      if (!['UP', 'DOWN'].includes(direction) || !validTimeframes.includes(timeframe)) {
        throw new AppError('VALIDATION_ERROR', 400, 'بيانات غير صالحة');
      }
      if (!validTiers.includes(moveTier)) {
        throw new AppError('VALIDATION_ERROR', 400, 'حجم التحرك المختار غير صالح');
      }
      expiresAt = getExpiresAt(timeframe);
    } else {
      // EXACT mode — direction derived from target vs current price
      targetPrice = Number(body.targetPrice);
      if (!targetPrice || targetPrice <= 0) {
        throw new AppError('VALIDATION_ERROR', 400, 'السعر المستهدف غير صالح');
      }

      const rawExpiry = body.expiresAt ? new Date(body.expiresAt) : null;
      const minExpiry = new Date(Date.now() + 86_400_000); // +24h
      const maxExpiry = new Date(Date.now() + 2 * 365 * 86_400_000); // +2 years
      if (!rawExpiry || isNaN(rawExpiry.getTime()) || rawExpiry < minExpiry || rawExpiry > maxExpiry) {
        throw new AppError('VALIDATION_ERROR', 400, 'تاريخ الانتهاء يجب أن يكون بين غد و سنتين من الآن');
      }
      expiresAt = rawExpiry;
      // Direction is derived at scoring time — store UP/DOWN based on target vs creation price
      // We'll store it as UP/DOWN after we fetch the current price below
      direction = 'UP'; // placeholder, will be overridden after price fetch
    }

    const trimmedReason = rawReason.trim();
    if (!trimmedReason) {
      throw new AppError('VALIDATION_ERROR', 400, 'يرجى كتابة سبب توقعك');
    }
    const wordCount = trimmedReason.split(/\s+/).filter(Boolean).length;
    if (wordCount < 10) {
      throw new AppError('VALIDATION_ERROR', 400,
        'السبب قصير جداً — اكتب على الأقل 10 كلمات توضح رأيك',
        { wordCount, required: 10 }
      );
    }
    if (trimmedReason.length > 500) {
      throw new AppError('VALIDATION_ERROR', 400, 'السبب طويل جداً (الحد الأقصى 500 حرف)');
    }

    const accountAge = Date.now() - new Date(user.createdAt ?? 0).getTime();
    if (accountAge < MIN_ACCOUNT_AGE_MS) {
      throw new AppError('ACCOUNT_TOO_NEW', 403, 'يجب أن يكون عمر الحساب 24 ساعة على الأقل لإنشاء توقعات');
    }

    const dailyLimit = await this.getDailyLimit(user);
    const dateStr    = getCairoDateString();
    const dailyKey   = `${DAILY_KEY_PREFIX}${userId}:${dateStr}`;
    const used       = Math.max(0, await getCount(dailyKey));
    if (used >= dailyLimit) {
      throw new AppError('DAILY_LIMIT_EXCEEDED', 429,
        `تم استهلاك حد التوقعات اليومي (${dailyLimit}). يتم إعادة التعيين عند منتصف الليل بتوقيت القاهرة.`
      );
    }

    const maxActive    = await this.getMaxActive(user);
    const activeCount  = await PredictionRepository.countActiveByUser(userId);
    if (activeCount >= maxActive) {
      throw new AppError('ACTIVE_LIMIT_EXCEEDED', 429,
        `وصلت للحد الأقصى من التوقعات النشطة (${maxActive}). انتظر حتى تنتهي بعض توقعاتك الحالية أو قم بترقية خطتك.`
      );
    }

    const activeSameTicker = await PredictionRepository.countActiveByUserAndTicker(userId, ticker);
    if (activeSameTicker > 0) {
      throw new AppError('DUPLICATE_ACTIVE_PREDICTION', 409, 'لديك توقع نشط بالفعل على هذا السهم');
    }

    const priceData = await getStockPrice(ticker);
    if (!priceData || typeof priceData.price !== 'number') {
      throw new AppError('PRICE_UNAVAILABLE', 503, 'السعر غير متوفر حالياً. حاول لاحقاً.');
    }

    // Derive direction for EXACT mode after we have the current price
    if (mode === 'EXACT' && targetPrice !== undefined) {
      if (Math.abs((targetPrice - priceData.price) / priceData.price) < 0.001) {
        throw new AppError('VALIDATION_ERROR', 400, 'السعر المستهدف قريب جداً من السعر الحالي');
      }
      direction = targetPrice > priceData.price ? 'UP' : 'DOWN';
    }

    const prediction = await PredictionRepository.create({
      userId,
      ticker,
      mode,
      direction: direction!,
      moveTier:    mode === 'TIER' ? moveTier : undefined,
      timeframe:   mode === 'TIER' ? timeframe : undefined,
      targetPrice: mode === 'EXACT' ? targetPrice : undefined,
      priceAtCreation: priceData.price,
      reason:   trimmedReason,
      expiresAt,
      isPublic,
    });

    await incrWithExpire(dailyKey, getCairoMidnightExpirySeconds());
    return prediction;
  },

  async delete(userId: number, predictionId: string) {
    const prediction = await PredictionRepository.findOwned(predictionId, userId);
    if (!prediction) {
      throw new AppError('NOT_FOUND', 404, 'التوقع غير موجود أو لا تملك صلاحية حذفه');
    }
    if (Date.now() - prediction.createdAt.getTime() > DELETION_WINDOW_MS) {
      throw new AppError('DELETE_WINDOW_EXPIRED', 403, 'لا يمكن حذف التوقع بعد مرور 5 دقائق من إنشائه');
    }
    const dailyKey = `${DAILY_KEY_PREFIX}${userId}:${getCairoDateStringFromDate(prediction.createdAt)}`;
    // Decrement Redis first — if DB delete fails the user keeps their slot (better UX than the reverse)
    await decrCount(dailyKey);
    try {
      await PredictionRepository.delete(predictionId);
    } catch (err) {
      // Restore Redis counter if DB delete fails
      await incrWithExpire(dailyKey, getCairoMidnightExpirySeconds()).catch(() => null);
      throw err;
    }
  },

  async getFeed(viewerId: number, filter: 'all' | 'following' | 'top', ticker: string | undefined, page: number, limit: number) {
    const data = await PredictionRepository.getFeed({
      viewerId, filter, ticker,
      page:  filter === 'top' ? 1         : page,
      limit: filter === 'top' ? Math.min(100, limit * 5) : limit,
    });
    if (filter === 'top') {
      const sorted = [...data.items].sort((a, b) => (b.userAccuracyRate ?? 0) - (a.userAccuracyRate ?? 0));
      const start  = (page - 1) * limit;
      data.items               = sorted.slice(start, start + limit);
      data.pagination.total    = sorted.length;
      data.pagination.totalPages = Math.ceil(sorted.length / limit);
    }
    return data;
  },

  async getMy(userId: number, status: string | undefined, page: number, limit: number) {
    const statusVal = status && ['ACTIVE', 'HIT', 'MISSED', 'EXPIRED'].includes(status)
      ? (status as 'ACTIVE' | 'HIT' | 'MISSED' | 'EXPIRED')
      : undefined;
    const [items, total] = await Promise.all([
      PredictionRepository.getMy(userId, statusVal, page, limit),
      PredictionRepository.getMyCount(userId, statusVal),
    ]);
    const likedIds = await PredictionRepository.findLikedPredictionIds(userId, items.map((p) => p.id));
    const likedSet = new Set(likedIds);
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

  async getLeaderboard(period: 'alltime' | 'month' | 'week', limit: number) {
    return PredictionRepository.getLeaderboard(period, limit);
  },

  async getStatsByUsername(username: string, viewerId: number) {
    interface StatsUser {
      id: number;
      isPrivate: boolean;
      predictionStats: { rank: UserRank; accuracyRate: number; totalPredictions: number } | null;
    }
    const user = (await UserRepository.findUnique({
      where:  { username },
      select: { id: true, isPrivate: true, predictionStats: true },
    })) as unknown as StatsUser | null;
    if (!user) throw new AppError('NOT_FOUND', 404, 'المستخدم غير موجود');
    const stats = user.predictionStats;
    if (!stats) return { rank: 'BEGINNER' as UserRank, totalPredictions: 0, private: false };
    const follow     = await FollowRepository.findStatus(viewerId, user.id);
    const isFollowing = follow?.status === 'ACCEPTED';
    const canSeeFull = viewerId === user.id || !user.isPrivate || isFollowing;
    if (!canSeeFull) return { rank: stats.rank, totalPredictions: stats.totalPredictions, private: true };
    return { ...stats, private: false };
  },

  async getByTicker(ticker: string, viewerId: number) {
    const list     = await PredictionRepository.getByTicker(ticker);
    const likedIds = await PredictionRepository.findLikedPredictionIds(viewerId, list.map((p) => p.id));
    const likedSet = new Set(likedIds);
    const upCount   = list.filter((p) => p.direction === 'UP').length;
    const downCount = list.filter((p) => p.direction === 'DOWN').length;
    const sorted    = [...list].sort((a, b) =>
      (b.user.predictionStats?.accuracyRate ?? 0) - (a.user.predictionStats?.accuracyRate ?? 0)
    );
    return {
      upCount, downCount,
      predictions: sorted.map((p) => ({ ...p, likeCount: p._count.likes, isLikedByMe: likedSet.has(p.id) })),
    };
  },

  async toggleLike(predictionId: string, userId: number) {
    const prediction = await PredictionRepository.findById(predictionId);
    if (!prediction) throw new AppError('NOT_FOUND', 404, 'التوقع غير موجود');
    if (prediction.userId === userId) {
      throw new AppError('SELF_LIKE_FORBIDDEN', 403, 'لا يمكن الإعجاب بتوقعك الخاص');
    }
    const liked = await PredictionRepository.toggleLike(predictionId, userId);
    if (liked) {
      const liker = await UserRepository.findUnique({ where: { id: userId }, select: { username: true } });
      await createNotification(
        prediction.userId, 'prediction_liked',
        'إعجاب بتوقعك',
        `${liker?.username ?? 'مستخدم'} أعجبه توقعك على ${prediction.ticker}`,
        { route: '/predictions' }
      );
    }
    return liked;
  },

  // ─── Core Scoring Engine ─────────────────────────────────────────────────────
  async resolveAndScore(predictionId: string, resolvedPrice: number) {
    const prediction = await PredictionRepository.findByIdForResolution(predictionId);
    if (!prediction || prediction.status !== 'ACTIVE') return;

    let pointsEarned: number;
    let accuracyPct:  number;
    let status: 'HIT' | 'MISSED';

    if (prediction.mode === 'EXACT') {
      // ── EXACT mode ─────────────────────────────────────────────────────────
      if (!prediction.targetPrice) {
        // Data integrity issue — mark as EXPIRED rather than leaving it stuck in ACTIVE forever
        await PredictionRepository.updateResolution(predictionId, {
          status: 'MISSED',
          resolvedPrice,
          resolvedAt: new Date(),
          pointsEarned: 0,
          accuracyPct: 0,
        });
        logger.error('EXACT prediction missing targetPrice', { predictionId });
        return;
      }
      const r = scoreExact(
        prediction.targetPrice, resolvedPrice,
        prediction.priceAtCreation, prediction.createdAt, prediction.expiresAt
      );
      pointsEarned = r.basePoints >= 0 ? Math.round(r.basePoints * r.multiplier) : r.basePoints;
      accuracyPct  = r.accuracyPct;
      status       = r.status;
    } else {
      // ── TIER mode ──────────────────────────────────────────────────────────
      const direction  = prediction.direction;
      const moveTier   = (prediction.moveTier ?? 'MEDIUM') as MoveTier;
      const timeframe  = prediction.timeframe!;
      const signedMovePct = ((resolvedPrice - prediction.priceAtCreation) / prediction.priceAtCreation) * 100;

      const directionCorrect =
        (direction === 'UP'   && resolvedPrice > prediction.priceAtCreation) ||
        (direction === 'DOWN' && resolvedPrice < prediction.priceAtCreation);

      const absMovePct = Math.abs(signedMovePct);
      const actualTier = getTierForMove(absMovePct, timeframe);
      const basePts    = TIER_DEFS[moveTier].basePoints;

      let basePoints: number;
      let tierAccuracy: number;

      if (!directionCorrect) {
        basePoints   = MISS_POINTS;
        tierAccuracy = 0;
      } else if (actualTier === 'FLAT') {
        basePoints   = Math.round(basePts * 0.08);
        tierAccuracy = 8;
      } else {
        const dist = Math.abs(TIER_ORDER.indexOf(moveTier) - TIER_ORDER.indexOf(actualTier));
        if (dist === 0) {
          basePoints   = basePts;
          tierAccuracy = 100;
        } else if (dist === 1) {
          basePoints   = Math.round(basePts * 0.25);
          tierAccuracy = 50;
        } else {
          basePoints   = Math.round(basePts * 0.08);
          tierAccuracy = 20;
        }
      }

      const multiplier = TIMEFRAME_MULTIPLIER[timeframe] ?? 1;
      pointsEarned     = basePoints >= 0 ? Math.round(basePoints * multiplier) : basePoints;
      pointsEarned     = Math.max(MISS_POINTS, pointsEarned);
      accuracyPct      = tierAccuracy;
      status           = directionCorrect && actualTier !== 'FLAT' ? 'HIT' : 'MISSED';
    }

    await PredictionRepository.updateResolution(predictionId, {
      status,
      resolvedPrice,
      resolvedAt:  new Date(),
      pointsEarned,
      accuracyPct,
    });

    // ── User stats ───────────────────────────────────────────────────────────
    const stats              = await PredictionRepository.getStatsByUserId(prediction.userId);
    const totalPredictions   = (stats?.totalPredictions   ?? 0) + 1;
    const correctPredictions = (stats?.correctPredictions ?? 0) + (status === 'HIT' ? 1 : 0);
    const totalPoints        = (stats?.totalPoints        ?? 0) + pointsEarned;
    const accuracyRate       = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
    const currentStreak      = status === 'HIT' ? (stats?.currentStreak ?? 0) + 1 : 0;
    const bestStreak         = Math.max(stats?.bestStreak ?? 0, currentStreak);
    const rank               = computeRank({ totalPredictions, accuracyRate });
    const oldRank            = stats?.rank;

    await PredictionRepository.upsertUserStats(prediction.userId, {
      totalPredictions, correctPredictions, totalPoints,
      accuracyRate, currentStreak, bestStreak, rank,
    });

    if (oldRank !== rank) {
      const rankLabels: Record<UserRank, string> = {
        BEGINNER: 'مبتدئ', ANALYST: 'محلل', SENIOR: 'محلل متقدم', EXPERT: 'خبير', LEGEND: 'أسطورة',
      };
      await createNotification(
        prediction.userId, 'rank_up',
        'تهانينا! ارتقيت إلى رتبة جديدة',
        `🏆 ارتقيت إلى رتبة ${rankLabels[rank] ?? rank}`,
        { route: '/predictions' }
      );
    }

    return { status, pointsEarned, userId: prediction.userId };
  },
};
