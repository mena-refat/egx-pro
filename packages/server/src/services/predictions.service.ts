import { AppError } from '../lib/errors.ts';
import { createNotification } from '../lib/createNotification.ts';
import { getStockPrice } from '../lib/stockData.ts';
import { incrWithExpire, getCount, decrCount } from '../lib/redis.ts';
import { getCairoDateString, getCairoDateStringFromDate, getCairoMidnightExpirySeconds } from '../lib/cairo-date.ts';
import { PREDICTION_LIMITS } from '../lib/constants.ts';
import { isPaid } from '../lib/plan.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import { PredictionRepository } from '../repositories/prediction.repository.ts';
import { FollowRepository } from '../repositories/follow.repository.ts';
import type { PredictionDir, PredictionTime, MoveTier, UserRank } from '@prisma/client';

const DAILY_KEY_PREFIX = 'predictions:daily:';
const DELETION_WINDOW_MS = PREDICTION_LIMITS.deletionWindowMinutes * 60 * 1000;
const MIN_ACCOUNT_AGE_MS = PREDICTION_LIMITS.minAccountAgeHours * 60 * 60 * 1000;

// ─── Move Tier Definitions ────────────────────────────────────────────────────
// Calibrated for EGX market characteristics:
//   • Daily price limit ±10%
//   • Typical quarterly blue-chip moves: 5-20%
//   • High-volatility small-cap: 20-40%
//   • EXTREME (>30%) requires exceptional calls (earnings surprises, macro events)

export interface TierDef {
  min:        number;   // inclusive lower bound (% absolute move in predicted direction)
  max:        number;   // exclusive upper bound (Infinity for EXTREME)
  basePoints: number;   // points earned when tier is correctly predicted
  labelAr:    string;
  labelEn:    string;
  rangeLabel: string;
}

export const TIER_DEFS: Record<MoveTier, TierDef> = {
  LIGHT:   { min: 1,  max: 5,        basePoints: 30,  labelAr: 'خفيف',   labelEn: 'Light',   rangeLabel: '1-5٪'  },
  MEDIUM:  { min: 5,  max: 15,       basePoints: 60,  labelAr: 'متوسط',  labelEn: 'Medium',  rangeLabel: '5-15٪' },
  STRONG:  { min: 15, max: 30,       basePoints: 100, labelAr: 'قوي',    labelEn: 'Strong',  rangeLabel: '15-30٪'},
  EXTREME: { min: 30, max: Infinity, basePoints: 150, labelAr: 'متطرف',  labelEn: 'Extreme', rangeLabel: '>30٪'  },
};

// Points when direction is correct but tier is off
const ADJACENT_TIER_POINTS  = 20;  // ±1 tier — direction right, magnitude slightly off
const DIRECTION_ONLY_POINTS = 10;  // ±2+ tiers or FLAT — direction right, magnitude way off
const MISS_POINTS           = -5;  // Wrong direction — small penalty to discourage flip-flopping

// Timeframe multipliers — superlinear curve rewarding long-term commitment.
// Research basis: prediction difficulty grows roughly with sqrt(time),
// but long-term predictors add more portfolio value, hence the boost.
const TIMEFRAME_MULTIPLIER: Record<PredictionTime, number> = {
  WEEK:         1.0,
  MONTH:        1.4,
  THREE_MONTHS: 2.0,
  SIX_MONTHS:   2.8,
  NINE_MONTHS:  3.5,
  YEAR:         5.0,
};

// Tier order for adjacency calculation
const TIER_ORDER: MoveTier[] = ['LIGHT', 'MEDIUM', 'STRONG', 'EXTREME'];

function getTierForMove(absPct: number): MoveTier | 'FLAT' {
  if (absPct < 1) return 'FLAT';
  for (const tier of TIER_ORDER) {
    const def = TIER_DEFS[tier];
    if (absPct >= def.min && absPct < def.max) return tier;
  }
  return 'EXTREME';
}

function tierDistance(a: MoveTier, b: MoveTier): number {
  return Math.abs(TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b));
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
    return isPaid(user) ? PREDICTION_LIMITS.proDaily : PREDICTION_LIMITS.freeDaily;
  },

  async getDailyUsed(userId: number): Promise<number> {
    const key = `${DAILY_KEY_PREFIX}${userId}:${getCairoDateString()}`;
    return Math.max(0, await getCount(key));
  },

  async getLimits(userId: number, user: { plan?: string | null; planExpiresAt?: Date | null; referralProExpiresAt?: Date | null }) {
    const [limit, used] = await Promise.all([
      this.getDailyLimit(user),
      this.getDailyUsed(userId),
    ]);
    const midnightSec = getCairoMidnightExpirySeconds();
    return { used, limit, resetsAt: new Date(midnightSec * 1000).toISOString() };
  },

  async create(
    userId:  number,
    user:    { plan?: string | null; planExpiresAt?: Date | null; referralProExpiresAt?: Date | null; createdAt?: Date },
    body:    {
      ticker:     string;
      direction:  PredictionDir;
      moveTier:   MoveTier;
      timeframe:  PredictionTime;
      reason?:    string | null;
      isPublic?:  boolean;
    }
  ) {
    const ticker    = String(body.ticker || '').trim().toUpperCase();
    const direction = body.direction as PredictionDir;
    const moveTier  = body.moveTier  as MoveTier;
    const timeframe = (body.timeframe || 'WEEK') as PredictionTime;
    const rawReason = typeof body.reason === 'string' ? body.reason : '';
    const isPublic  = body.isPublic !== false;

    const validTimeframes: PredictionTime[] = ['WEEK', 'MONTH', 'THREE_MONTHS', 'SIX_MONTHS', 'NINE_MONTHS', 'YEAR'];
    const validTiers:      MoveTier[]       = ['LIGHT', 'MEDIUM', 'STRONG', 'EXTREME'];

    if (!ticker || !['UP', 'DOWN'].includes(direction) || !validTimeframes.includes(timeframe)) {
      throw new AppError('VALIDATION_ERROR', 400, 'بيانات غير صالحة');
    }
    if (!validTiers.includes(moveTier)) {
      throw new AppError('VALIDATION_ERROR', 400, 'حجم التحرك المختار غير صالح');
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

    const activeSameTicker = await PredictionRepository.countActiveByUserAndTicker(userId, ticker);
    if (activeSameTicker > 0) {
      throw new AppError('DUPLICATE_ACTIVE_PREDICTION', 409, 'لديك توقع نشط بالفعل على هذا السهم');
    }

    const priceData = await getStockPrice(ticker);
    if (!priceData || typeof priceData.price !== 'number') {
      throw new AppError('PRICE_UNAVAILABLE', 503, 'السعر غير متوفر حالياً. حاول لاحقاً.');
    }

    const expiresAt = getExpiresAt(timeframe);
    const prediction = await PredictionRepository.create({
      userId,
      ticker,
      direction,
      moveTier,
      priceAtCreation: priceData.price,
      timeframe,
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
    await PredictionRepository.delete(predictionId);
    await decrCount(dailyKey);
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
      items: items.map((p) => ({ ...p, likeCount: p._count.likes, isLikedByMe: likedSet.has(p.id) })),
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
  /**
   * Resolves a prediction against the actual closing price and scores it.
   *
   * New tier-based scoring model (EGX-calibrated):
   *
   *  Step 1 — Direction check: did price move in the predicted direction?
   *  Step 2 — Magnitude: compute |actual move %| in predicted direction
   *  Step 3 — Tier matching: map actual move to LIGHT/MEDIUM/STRONG/EXTREME/FLAT
   *  Step 4 — Base points:
   *              Wrong direction            →  -5  (MISS_POINTS)
   *              Right dir, move < 1%       →  10  (DIRECTION_ONLY_POINTS, flat market)
   *              Right dir, tier exact      →  tierDef.basePoints (30/60/100/150)
   *              Right dir, 1 tier adjacent →  20  (ADJACENT_TIER_POINTS)
   *              Right dir, 2+ tiers off    →  10  (DIRECTION_ONLY_POINTS)
   *  Step 5 — × TIMEFRAME_MULTIPLIER (1.0 → 5.0 for WEEK → YEAR)
   *
   *  HIT   = direction correct AND actual move ≥ 1%
   *  MISSED = direction wrong OR actual move < 1%
   *
   *  accuracyPct = tier accuracy score (100/50/25/10/0)
   */
  async resolveAndScore(predictionId: string, resolvedPrice: number) {
    const prediction = await PredictionRepository.findByIdForResolution(predictionId);
    if (!prediction || prediction.status !== 'ACTIVE') return;

    const direction  = prediction.direction;
    const moveTier   = (prediction.moveTier ?? 'MEDIUM') as MoveTier;
    const signedMovePct = ((resolvedPrice - prediction.priceAtCreation) / prediction.priceAtCreation) * 100;

    const directionCorrect =
      (direction === 'UP'   && resolvedPrice > prediction.priceAtCreation) ||
      (direction === 'DOWN' && resolvedPrice < prediction.priceAtCreation);

    const absMovePct = Math.abs(signedMovePct);
    const actualTier = getTierForMove(absMovePct);

    // ── Base points ──────────────────────────────────────────────────────────
    let basePoints:  number;
    let tierAccuracy: number;

    if (!directionCorrect) {
      basePoints   = MISS_POINTS;
      tierAccuracy = 0;
    } else if (actualTier === 'FLAT') {
      basePoints   = DIRECTION_ONLY_POINTS;
      tierAccuracy = 10;
    } else {
      const dist = tierDistance(moveTier, actualTier);
      if (dist === 0) {
        basePoints   = TIER_DEFS[moveTier].basePoints;
        tierAccuracy = 100;
      } else if (dist === 1) {
        basePoints   = ADJACENT_TIER_POINTS;
        tierAccuracy = 50;
      } else {
        basePoints   = DIRECTION_ONLY_POINTS;
        tierAccuracy = 25;
      }
    }

    // ── Timeframe multiplier ─────────────────────────────────────────────────
    const multiplier   = TIMEFRAME_MULTIPLIER[prediction.timeframe] ?? 1;
    let   pointsEarned = basePoints >= 0 ? Math.round(basePoints * multiplier) : basePoints;
    pointsEarned       = Math.max(MISS_POINTS, pointsEarned);

    // ── Status ───────────────────────────────────────────────────────────────
    const status: 'HIT' | 'MISSED' =
      directionCorrect && actualTier !== 'FLAT' ? 'HIT' : 'MISSED';

    await PredictionRepository.updateResolution(predictionId, {
      status,
      resolvedPrice,
      resolvedAt:  new Date(),
      pointsEarned,
      accuracyPct: tierAccuracy,
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
