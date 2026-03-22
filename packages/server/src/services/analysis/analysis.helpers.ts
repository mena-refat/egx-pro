import { getStockHistory, getFinancials } from '../../lib/stockData.ts';
import { getStockNews } from '../../lib/news.ts';
import { marketDataService } from '../market-data/market-data.service.ts';
import { logger } from '../../lib/logger.ts';
import { getLimit, type UserForPlan } from '../../lib/plan.ts';
import { AppError } from '../../lib/errors.ts';
import {
  EXPLAIN_SINGLE_SYSTEM,
  EXPLAIN_SINGLE_PRO_SYSTEM,
  EXPLAIN_COMPARE_SYSTEM,
  EXPLAIN_COMPARE_PRO_SYSTEM,
  RECOMMENDATIONS_SYSTEM,
} from '../../lib/analysisPrompts.ts';
import { computeScore, DECISION_LABELS_AR } from '../../lib/scoringEngine.ts';
import { analysisEngine } from '../ai/index.ts';
import { withRetry } from '../../lib/retry.ts';
import { calculateIndicators } from '../../lib/technicalIndicators.ts';
import { getMarketContext } from '../../lib/marketContext.ts';
import {
  ANALYSIS_DATA_GATHER_TIMEOUT_MS,
  ANALYSIS_MAX_TOKENS_SINGLE,
  ANALYSIS_MAX_TOKENS_SINGLE_PRO,
  ANALYSIS_MAX_TOKENS_COMPARE,
  ANALYSIS_MAX_TOKENS_COMPARE_PRO,
  ANALYSIS_MAX_TOKENS_RECOMMENDATIONS,
} from '../../lib/constants.ts';
import { prisma } from '../../lib/prisma.ts';
import { redis, getCache, setCache, deleteCache } from '../../lib/redis.ts';

export const nullFinancials = {
  pe: null as number | null,
  forwardPe: null as number | null,
  eps: null as number | null,
  roe: null as number | null,
  roa: null as number | null,
  debtToEquity: null as number | null,
  grossMargin: null as number | null,
  profitMargin: null as number | null,
  operatingMargin: null as number | null,
  revenue: null as number | null,
  revenueGrowth: null as number | null,
  netIncome: null as number | null,
  freeCashFlow: null as number | null,
  dividendYield: null as number | null,
  bookValue: null as number | null,
  priceToBook: null as number | null,
  marketCap: null as number | null,
  beta: null as number | null,
};

export const defaultMarketCtx = {
  egx30: null as { price: number; changePercent: number } | null,
  usdEgp: null as number | null,
  marketStatus: 'غير متاح',
  timestamp: new Date().toISOString(),
} as const;

export function getFirstDayOfNextMonth(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const COOLDOWN_SECONDS = 60;

/**
 * Fast pre-check: throws ANALYSIS_LIMIT_REACHED if user is clearly over quota.
 * Non-transactional (optimistic read). atomicConsumeQuota still does the final atomic check.
 */
export async function preCheckQuota(userId: number): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      planExpiresAt: true,
      referralProExpiresAt: true,
      aiAnalysisUsedThisMonth: true,
      aiAnalysisResetDate: true,
    },
  });
  if (!user) throw new AppError('UNAUTHORIZED', 401);

  const now = new Date();
  const usedThisMonth =
    user.aiAnalysisResetDate == null || now >= user.aiAnalysisResetDate
      ? 0
      : (user.aiAnalysisUsedThisMonth ?? 0);

  const planUser: UserForPlan = {
    plan: user.plan,
    planExpiresAt: user.planExpiresAt,
    referralProExpiresAt: user.referralProExpiresAt,
  };
  const quota = getLimit(planUser, 'aiAnalysisPerMonth') as number;

  if (usedThisMonth >= quota) {
    throw new AppError('ANALYSIS_LIMIT_REACHED', 402, 'تم استنفاد حصة التحليلات لهذا الشهر', {
      code: 'ANALYSIS_LIMIT_REACHED',
      used: usedThisMonth,
      quota,
    });
  }
}

/**
 * Atomic cooldown check-and-set via Redis SET NX EX.
 * Returns true if cooldown was acquired (request can proceed).
 * Returns false if user already made a request within the last 60 seconds.
 */
export async function tryAcquireAnalysisCooldown(userId: number): Promise<boolean> {
  const key = `analysis_cooldown:${userId}`;
  if (redis) {
    try {
      const result = await redis.set(key, '1', { nx: true, ex: COOLDOWN_SECONDS });
      return result === 'OK';
    } catch {
      // Redis error — allow the request rather than blocking the user
      return true;
    }
  }
  // No Redis: fallback to in-memory cache
  const existing = await getCache<string>(key);
  if (existing) return false;
  await setCache(key, '1', COOLDOWN_SECONDS);
  return true;
}

/** Release cooldown key (call if AI request fails, so user isn't penalised). */
export async function releaseAnalysisCooldown(userId: number): Promise<void> {
  await deleteCache(`analysis_cooldown:${userId}`);
}

export async function atomicConsumeQuota(userId: number, points: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        plan: true,
        planExpiresAt: true,
        referralProExpiresAt: true,
        aiAnalysisUsedThisMonth: true,
        aiAnalysisResetDate: true,
      },
    });

    if (!user) {
      throw new AppError('UNAUTHORIZED', 401);
    }

    const now = new Date();
    let usedThisMonth = user.aiAnalysisUsedThisMonth ?? 0;
    let resetDate = user.aiAnalysisResetDate;

    if (resetDate == null || now >= resetDate) {
      usedThisMonth = 0;
      resetDate = getFirstDayOfNextMonth();
    }

    const planUser: UserForPlan = {
      plan: user.plan,
      planExpiresAt: user.planExpiresAt,
      referralProExpiresAt: user.referralProExpiresAt,
    };

    const quota = getLimit(planUser, 'aiAnalysisPerMonth') as number;

    if (usedThisMonth + points > quota) {
      throw new AppError('ANALYSIS_LIMIT_REACHED', 402, 'تم استنفاد حصة التحليلات لهذا الشهر', {
        code: 'ANALYSIS_LIMIT_REACHED',
        used: usedThisMonth,
        quota,
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        aiAnalysisUsedThisMonth: usedThisMonth + points,
        aiAnalysisResetDate: resetDate,
      },
    });
  });
}

function isRetryableAnalysisError(err: unknown): boolean {
  const msg = (err as Error)?.message ?? '';
  if (msg.includes('rate') || msg.includes('429') || msg.includes('RATE_LIMITED')) return false;
  if (msg.includes('SERVICE_UNAVAILABLE') || msg.includes('not set') || msg.includes('API_KEY')) return false;
  return true;
}

export async function runAnalysisEngine(system: string, userMessage: string, maxTokens = 4000): Promise<string> {
  if (!process.env.CLAUDE_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new AppError('SERVICE_UNAVAILABLE', 503, 'خدمة التحليل غير متاحة حالياً. حاول لاحقاً.');
  }
  try {
    const { text } = await withRetry(
      () => analysisEngine.generate({
        taskType: 'financial_analysis',
        systemPrompt: system,
        userMessage,
        maxTokens,
        responseType: 'text',
        temperature: 0.1,
      }),
      { maxAttempts: 3, baseDelayMs: 3000, retryable: isRetryableAnalysisError }
    );
    return text;
  } catch (err) {
    const msg = (err as Error)?.message ?? '';
    logger.error('Analysis engine error', { error: msg });

    if (msg.includes('rate') || msg.includes('429')) {
      throw new AppError('RATE_LIMITED', 429, 'خدمة التحليل مشغولة حالياً. حاول بعد دقيقة.');
    }
    if (msg.includes('timeout') || msg.includes('ECONNABORTED') || msg.includes('504') || msg.includes('abort') || msg.includes('AbortError')) {
      throw new AppError('ANALYSIS_TIMEOUT', 504, 'التحليل أخد وقت طويل. حاول تاني.');
    }
    throw new AppError('ANALYSIS_FAILED', 502, msg || 'فشل في الحصول على التحليل. حاول تاني.');
  }
}

export function parseAnalysisJson(rawText: string): unknown {
  try {
    return JSON.parse(rawText);
  } catch {}

  const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {}

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const extracted = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(extracted);
    } catch {}
  }

  if (firstBrace !== -1) {
    let partial = cleaned.slice(firstBrace);
    const quoteCount = (partial.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) partial += '"';
    let openBraces = 0;
    let openBrackets = 0;
    for (const ch of partial) {
      if (ch === '{') openBraces++;
      else if (ch === '}') openBraces--;
      else if (ch === '[') openBrackets++;
      else if (ch === ']') openBrackets--;
    }
    partial = partial.replace(/,\s*"[^"]*"?\s*:?\s*[^}\]]*$/, '');
    for (let i = 0; i < openBrackets; i++) partial += ']';
    for (let i = 0; i < openBraces; i++) partial += '}';
    try {
      return JSON.parse(partial);
    } catch {}
    const lastComma = partial.lastIndexOf(',');
    if (lastComma > 0) {
      let trimmed = partial.slice(0, lastComma);
      openBraces = 0;
      openBrackets = 0;
      for (const ch of trimmed) {
        if (ch === '{') openBraces++;
        else if (ch === '}') openBraces--;
        else if (ch === '[') openBrackets++;
        else if (ch === ']') openBrackets--;
      }
      for (let i = 0; i < openBrackets; i++) trimmed += ']';
      for (let i = 0; i < openBraces; i++) trimmed += '}';
      try {
        return JSON.parse(trimmed);
      } catch {}
    }
  }

  logger.warn('Could not parse Claude response as JSON', { length: rawText.length, first100: rawText.slice(0, 100) });
  return {
    summary: rawText.slice(0, 500),
    verdict: 'غير متاح',
    verdictBadge: 'غير متاح',
    disclaimer: 'هذا التحليل للأغراض التعليمية فقط',
  };
}

export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function getPriceForAnalysis(ticker: string): Promise<{ price: number; changePercent: number; volume: number | null } | null> {
  const quote = await marketDataService.getQuote(ticker);
  if (!quote || quote.price <= 0) return null;
  return {
    price: quote.price,
    changePercent: quote.changePercent,
    volume: quote.volume ?? null,
  };
}

export {
  ANALYSIS_DATA_GATHER_TIMEOUT_MS,
  ANALYSIS_MAX_TOKENS_SINGLE, ANALYSIS_MAX_TOKENS_SINGLE_PRO,
  ANALYSIS_MAX_TOKENS_COMPARE, ANALYSIS_MAX_TOKENS_COMPARE_PRO,
  ANALYSIS_MAX_TOKENS_RECOMMENDATIONS,
};
export { EXPLAIN_SINGLE_SYSTEM, EXPLAIN_SINGLE_PRO_SYSTEM, EXPLAIN_COMPARE_SYSTEM, EXPLAIN_COMPARE_PRO_SYSTEM, RECOMMENDATIONS_SYSTEM };
export type { AnalysisMode } from '../../lib/analysisCache.ts';
export { DECISION_LABELS_AR };
export { getStockHistory, getFinancials, getStockNews, getMarketContext, calculateIndicators, computeScore };
