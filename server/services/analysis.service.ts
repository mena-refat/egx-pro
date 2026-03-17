import { getStockHistory, getFinancials } from '../lib/stockData.ts';
import { getStockNews } from '../lib/news.ts';
import { marketDataService } from './market-data/market-data.service.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import { PortfolioRepository } from '../repositories/portfolio.repository.ts';
import { AnalysisRepository } from '../repositories/analysis.repository.ts';
import { logger } from '../lib/logger.ts';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { getLimit, type UserForPlan } from '../lib/plan.ts';
import { AppError } from '../lib/errors.ts';
import {
  SINGLE_ANALYSIS_SYSTEM,
  COMPARE_SYSTEM,
  RECOMMENDATIONS_SYSTEM,
  EXPLAIN_SINGLE_SYSTEM,
  EXPLAIN_COMPARE_SYSTEM,
} from '../lib/analysisPrompts.ts';
import { computeScore, DECISION_LABELS_AR } from '../lib/scoringEngine.ts';
import { analysisEngine } from './ai/index.ts';
import { EGX_STOCKS } from '../../src/lib/egxStocks.ts';
import { withRetry } from '../lib/retry.ts';
import { calculateIndicators } from '../lib/technicalIndicators.ts';
import { getMarketContext } from '../lib/marketContext.ts';
import { getCachedAnalysis, setCachedAnalysis, singleKey, compareKey } from '../lib/analysisCache.ts';
import { generateQuickAnalysis } from '../lib/quickAnalysis.ts';
import { getAnalysisNewsCutoff, getAnalysisSessionDateString } from '../lib/cairo-date.ts';
import {
  ANALYSIS_DATA_GATHER_TIMEOUT_MS,
  ANALYSIS_MAX_TOKENS_SINGLE,
  ANALYSIS_MAX_TOKENS_COMPARE,
  ANALYSIS_MAX_TOKENS_RECOMMENDATIONS,
} from '../lib/constants.ts';
import { prisma } from '../lib/prisma.ts';

const nullFinancials = {
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

const defaultMarketCtx = {
  egx30: null as { price: number; changePercent: number } | null,
  usdEgp: null as number | null,
  marketStatus: 'غير متاح',
  timestamp: new Date().toISOString(),
} as const;

function getFirstDayOfNextMonth(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** يتحقق من الحصة ويخصمها في عملية واحدة ذرّية باستخدام Prisma transaction. */
async function atomicConsumeQuota(userId: string, points: number): Promise<void> {
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

/** لا نعيد المحاولة على rate limit أو عدم توفر الخدمة */
function isRetryableAnalysisError(err: unknown): boolean {
  const msg = (err as Error)?.message ?? '';
  if (msg.includes('rate') || msg.includes('429') || msg.includes('RATE_LIMITED')) return false;
  if (msg.includes('SERVICE_UNAVAILABLE') || msg.includes('not set') || msg.includes('API_KEY')) return false;
  return true;
}

/** يستدعي محرك التحليل (Claude ثم OpenAI fallback) مع إعادة محاولة عند timeout/فشل مؤقت. */
async function runAnalysisEngine(system: string, userMessage: string, maxTokens = 4000): Promise<string> {
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

function parseAnalysisJson(rawText: string): unknown {
  // 1. حاول مباشرة
  try {
    return JSON.parse(rawText);
  } catch {}

  // 2. شيل backticks وأي text قبل/بعد الـ JSON
  const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 3. استخرج أول { ... } block
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const extracted = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(extracted);
    } catch {}
  }

  // 4. ══ JSON REPAIR — لو مقطوع (Claude وصل limit) ══
  if (firstBrace !== -1) {
    let partial = cleaned.slice(firstBrace);

    // أغلق أي string مفتوح
    const quoteCount = (partial.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) partial += '"';

    // أغلق brackets مفتوحة
    let openBraces = 0;
    let openBrackets = 0;
    for (const ch of partial) {
      if (ch === '{') openBraces++;
      else if (ch === '}') openBraces--;
      else if (ch === '[') openBrackets++;
      else if (ch === ']') openBrackets--;
    }

    // شيل آخر value مقطوع (ممكن يكون string أو number ناقص)
    partial = partial.replace(/,\s*"[^"]*"?\s*:?\s*[^}\]]*$/, '');

    // أغلق الـ brackets
    for (let i = 0; i < openBrackets; i++) partial += ']';
    for (let i = 0; i < openBraces; i++) partial += '}';

    try {
      return JSON.parse(partial);
    } catch {}

    // محاولة أخيرة — شيل آخر property وحاول
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

  // 5. كل المحاولات فشلت — ارجع الـ raw text كملخص
  logger.warn('Could not parse Claude response as JSON', { length: rawText.length, first100: rawText.slice(0, 100) });
  return {
    summary: rawText.slice(0, 500),
    verdict: 'غير متاح',
    verdictBadge: 'غير متاح',
    disclaimer: 'هذا التحليل للأغراض التعليمية فقط',
  };
}

/** تنفيذ promise مع وقت أقصى؛ عند انتهاء الوقت نرجع fallback بدل ما نعلق. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** يجيب السعر من market data (كاش أو جلب مباشر) بدل الاعتماد على Redis فقط */
async function getPriceForAnalysis(ticker: string): Promise<{ price: number; changePercent: number; volume: number | null } | null> {
  const quote = await marketDataService.getQuote(ticker);
  if (!quote || quote.price <= 0) return null;
  return {
    price: quote.price,
    changePercent: quote.changePercent,
    volume: quote.volume ?? null,
  };
}

export const AnalysisService = {
  async create(
    userId: string,
    ticker: string
  ): Promise<{ analysis: unknown; id: string; newUnseenAchievements: string[] }> {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);
    await atomicConsumeQuota(userId, 1);

    // ══ الطبقة 1: Cache — لو حد حلل نفس السهم النهارده، ارجع النتيجة المحفوظة ══
    const cacheKey = singleKey(ticker);
    const cached = await getCachedAnalysis<unknown>(cacheKey);
    if (cached) {
      const saved = await AnalysisRepository.create({
        userId,
        ticker,
        content: JSON.stringify(cached),
      });
      const completedBefore = await getCompletedAchievementIds(userId);
      const newAchievements = await addNewlyUnlockedAchievements(userId, completedBefore);
      return { analysis: cached, id: saved.id, newUnseenAchievements: newAchievements };
    }

    const completedBefore = await getCompletedAchievementIds(userId);

    const stockInfo = EGX_STOCKS.find((s) => s.ticker.toUpperCase() === ticker.toUpperCase());
    const nameAr = stockInfo?.nameAr ?? ticker;
    const nameEn = stockInfo?.nameEn ?? ticker;
    const analysisSessionDate = getAnalysisSessionDateString();
    const newsCutoff = getAnalysisNewsCutoff();
    const dataMs = ANALYSIS_DATA_GATHER_TIMEOUT_MS;

    const [priceData, history, financialsRaw, news, marketCtx] = await Promise.all([
      withTimeout(getPriceForAnalysis(ticker), dataMs, null),
      withTimeout(getStockHistory(ticker, '6mo').catch(() => []), dataMs, []),
      withTimeout(getFinancials(ticker), dataMs, null),
      withTimeout(getStockNews(nameAr, newsCutoff).catch(() => []), dataMs, [] as Array<{ title: string }>),
      withTimeout(
        getMarketContext().catch(() => ({ egx30: null, usdEgp: null, marketStatus: 'غير متاح', timestamp: new Date().toISOString() })),
        dataMs,
        { egx30: null, usdEgp: null, marketStatus: 'غير متاح', timestamp: new Date().toISOString() }
      ),
    ]);

    const financials = financialsRaw ?? nullFinancials;

    const indicators = calculateIndicators(history);
    const price = priceData?.price ?? (history.length > 0 ? history[history.length - 1].close : 0);
    const changePercent = priceData?.changePercent ?? 0;

    const scoringResult = computeScore({
      price,
      changePercent,
      volume: priceData?.volume ?? (history.length > 0 ? history[history.length - 1].volume : null),
      history,
      indicators,
      financials,
      market: marketCtx,
    });

    const priceBlock = priceData
      ? `السعر: ${priceData.price} جنيه | التغير: ${priceData.changePercent}%`
      : 'السعر: ابحث عنه';

    const fundLines: string[] = [];
    if (financials.pe != null) fundLines.push(`P/E: ${financials.pe.toFixed(2)}`);
    if (financials.roe != null) fundLines.push(`ROE: ${(financials.roe * 100).toFixed(1)}%`);
    if (financials.profitMargin != null) fundLines.push(`هامش: ${(financials.profitMargin * 100).toFixed(1)}%`);
    if (financials.debtToEquity != null) fundLines.push(`D/E: ${financials.debtToEquity.toFixed(2)}`);
    if (financials.eps != null) fundLines.push(`EPS: ${financials.eps.toFixed(2)}`);
    if (financials.revenue != null) fundLines.push(`إيرادات: ${financials.revenue.toLocaleString()}`);
    if (financials.freeCashFlow != null) fundLines.push(`FCF: ${financials.freeCashFlow.toLocaleString()}`);
    if (financials.dividendYield != null) fundLines.push(`توزيعات: ${(financials.dividendYield * 100).toFixed(2)}%`);
    if (financials.bookValue != null) fundLines.push(`قيمة دفترية: ${financials.bookValue.toFixed(2)}`);
    if (financials.marketCap != null && financials.marketCap > 0) fundLines.push(`قيمية سوقية: ${(financials.marketCap / 1e9).toFixed(2)} مليار`);
    if (financials.revenueGrowth != null) fundLines.push(`نمو إيرادات: ${(financials.revenueGrowth * 100).toFixed(1)}%`);
    const techLines: string[] = [];
    if (indicators.rsi14 != null) techLines.push(`RSI: ${indicators.rsi14}`);
    if (indicators.trend) techLines.push(`اتجاه: ${indicators.trend}`);
    if (indicators.macd != null) techLines.push(`MACD: ${indicators.macd}`);
    if (indicators.sma20 != null) techLines.push(`SMA20: ${indicators.sma20}`);
    if (indicators.sma50 != null) techLines.push(`SMA50: ${indicators.sma50}`);
    if (indicators.sma200 != null) techLines.push(`SMA200: ${indicators.sma200}`);
    if (indicators.support != null) techLines.push(`دعم: ${indicators.support}`);
    if (indicators.resistance != null) techLines.push(`مقاومة: ${indicators.resistance}`);
    if (indicators.vwap != null) techLines.push(`VWAP: ${indicators.vwap}`);
    if (indicators.atr14 != null) techLines.push(`ATR: ${indicators.atr14}`);
    if (indicators.bollingerUpper != null && indicators.bollingerLower != null)
      techLines.push(`Bollinger: ${indicators.bollingerLower.toFixed(1)}–${indicators.bollingerUpper.toFixed(1)}`);
    const vol =
      indicators.lastVolume != null && indicators.avgVolume20 != null
        ? `حجم: ${indicators.lastVolume.toLocaleString()} (متوسط: ${indicators.avgVolume20.toLocaleString()})`
        : '';
    if (vol) techLines.push(vol);
    const marketLine =
      marketCtx.egx30 != null
        ? `سوق: ${marketCtx.marketStatus} | EGX30: ${marketCtx.egx30.price} (${marketCtx.egx30.changePercent > 0 ? '+' : ''}${marketCtx.egx30.changePercent.toFixed(2)}%) | USD/EGP: ${marketCtx.usdEgp ?? '—'}`
        : `سوق: ${marketCtx.marketStatus} | USD/EGP: ${marketCtx.usdEgp ?? '—'}`;

    const newsLine =
      news.length > 0
        ? news
            .slice(0, 5)
            .map((n) => n.title)
            .join(' | ')
        : 'لا أخبار';

    const hasFund = fundLines.length > 0;
    const hasTech = techLines.length > 0;

    const scoreBlock = `النتيجة المحسوبة آلياً (لا تغيّرها): المجموع=${scoringResult.score} | القرار=${DECISION_LABELS_AR[scoringResult.decision]} | فني=${scoringResult.technical_score} | زخم=${scoringResult.momentum_score} | أساسي=${scoringResult.fundamental_score} | سوق=${scoringResult.market_score} | اقتصاد كلي=${scoringResult.macro_score} | مخاطر=${scoringResult.risk_score}.`;

    const prompt = `سهم: ${ticker} — ${nameAr} (${nameEn}). EGX.
${scoreBlock}
${priceBlock}
أساسي: ${hasFund ? fundLines.join(' | ') : 'غير متوفرة من المصدر'}
فني: ${hasTech ? techLines.join(' | ') : 'غير متوفرة من المصدر'}
${marketLine}
أخبار: ${newsLine}
اشرح لماذا هذا التقييم (${scoringResult.score}) وهذا القرار منطقيان بناءً على البيانات أعلاه. اخرج JSON بالشكل المحدد. لا تغيّر القرار ولا الأرقام.`;

    const rawText = await runAnalysisEngine(EXPLAIN_SINGLE_SYSTEM, prompt, ANALYSIS_MAX_TOKENS_SINGLE);
    const aiJson = parseAnalysisJson(rawText) as Record<string, unknown>;

    const verdictBadge = DECISION_LABELS_AR[scoringResult.decision];
    const analysisJson = {
      ...aiJson,
      score: scoringResult.score,
      decision: scoringResult.decision,
      verdictBadge,
      verdict: verdictBadge,
      confidenceScore: scoringResult.score,
      technical_score: scoringResult.technical_score,
      momentum_score: scoringResult.momentum_score,
      fundamental_score: scoringResult.fundamental_score,
      market_score: scoringResult.market_score,
      macro_score: scoringResult.macro_score,
      risk_score: scoringResult.risk_score,
      fundamental:
        aiJson.fundamental && typeof aiJson.fundamental === 'object'
          ? { ...(aiJson.fundamental as object), score: Math.round(scoringResult.fundamental_score * 4) }
          : { score: Math.round(scoringResult.fundamental_score * 4), highlights: [], keyRatios: {} },
      technical:
        aiJson.technical && typeof aiJson.technical === 'object'
          ? {
              ...(aiJson.technical as object),
              score: Math.round(scoringResult.technical_score * 2.5),
              trend: indicators.trend,
              support: indicators.support,
              resistance: indicators.resistance,
            }
          : {
              score: Math.round(scoringResult.technical_score * 2.5),
              trend: indicators.trend,
              highlights: [],
              keyIndicators: {},
              support: indicators.support,
              resistance: indicators.resistance,
            },
    };

    await setCachedAnalysis(cacheKey, analysisJson, 'claude');

    const analysisObj = analysisJson as { priceTarget?: { current?: number; base?: number; targetBase?: number; low?: number; high?: number; stopLoss?: number }; verdictBadge?: string };
    const pt = analysisObj.priceTarget;
    const trackData = {
      priceAtAnalysis: priceData?.price ?? (pt?.current != null ? Number(pt.current) : undefined),
      targetPrice:
        pt?.targetBase != null
          ? Number(pt.targetBase)
          : pt?.base != null
            ? Number(pt.base)
            : pt?.high != null
              ? Number(pt.high)
              : undefined,
      stopLoss: pt?.stopLoss != null ? Number(pt.stopLoss) : undefined,
      verdict: (analysisObj.verdictBadge ?? verdictBadge ?? '') as string,
    };
    const saved = await AnalysisRepository.create({
      userId,
      ticker,
      content: JSON.stringify(analysisJson),
      ...trackData,
    });
    const newAchievements = await addNewlyUnlockedAchievements(userId, completedBefore);
    return { analysis: analysisJson, id: saved.id, newUnseenAchievements: newAchievements };
  },

  /** مقارنة سهمين — تستهلك 2 نقطة تحليل */
  async compare(
    userId: string,
    ticker1: string,
    ticker2: string
  ): Promise<{ comparison: unknown; id: string }> {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);
    if (!ticker1 || !ticker2) throw new AppError('VALIDATION_ERROR', 400);
    const t1 = ticker1.trim().toUpperCase();
    const t2 = ticker2.trim().toUpperCase();
    if (t1 === t2) throw new AppError('SAME_STOCK_COMPARE', 400);
    await atomicConsumeQuota(userId, 2);

    const compareCacheKey = compareKey(t1, t2);
    const cachedCompare = await getCachedAnalysis<unknown>(compareCacheKey);
    if (cachedCompare) {
      const saved = await AnalysisRepository.create({
        userId,
        ticker: `${t1}|${t2}`,
        content: JSON.stringify(cachedCompare),
      });
      return { comparison: cachedCompare, id: saved.id };
    }

    const info1 = EGX_STOCKS.find((s) => s.ticker.toUpperCase() === t1);
    const info2 = EGX_STOCKS.find((s) => s.ticker.toUpperCase() === t2);
    const newsCutoff = getAnalysisNewsCutoff();
    const dataMs = ANALYSIS_DATA_GATHER_TIMEOUT_MS;

    const [quotes, f1, f2, h1, h2, news1, news2, marketCtx] = await Promise.all([
      withTimeout(marketDataService.getQuotes([t1, t2]), dataMs, new Map<string, { price: number; changePercent: number }>()),
      withTimeout(getFinancials(t1).catch(() => nullFinancials), dataMs, nullFinancials),
      withTimeout(getFinancials(t2).catch(() => nullFinancials), dataMs, nullFinancials),
      withTimeout(getStockHistory(t1, '3mo').catch(() => []), dataMs, []),
      withTimeout(getStockHistory(t2, '3mo').catch(() => []), dataMs, []),
      withTimeout(getStockNews(info1?.nameAr ?? t1, newsCutoff).catch(() => []), dataMs, [] as Array<{ title: string }>),
      withTimeout(getStockNews(info2?.nameAr ?? t2, newsCutoff).catch(() => []), dataMs, [] as Array<{ title: string }>),
      withTimeout(getMarketContext().catch(() => defaultMarketCtx), dataMs, defaultMarketCtx),
    ]);

    const ind1 = calculateIndicators(h1);
    const ind2 = calculateIndicators(h2);
    const p1 = quotes.get(t1);
    const p2 = quotes.get(t2);

    const price1 = p1?.price ?? (h1.length > 0 ? h1[h1.length - 1].close : 0);
    const price2 = p2?.price ?? (h2.length > 0 ? h2[h2.length - 1].close : 0);

    const score1 = computeScore({
      price: price1,
      changePercent: p1?.changePercent ?? 0,
      volume: h1.length > 0 ? h1[h1.length - 1].volume : null,
      history: h1,
      indicators: ind1,
      financials: f1,
      market: marketCtx,
    });
    const score2 = computeScore({
      price: price2,
      changePercent: p2?.changePercent ?? 0,
      volume: h2.length > 0 ? h2[h2.length - 1].volume : null,
      history: h2,
      indicators: ind2,
      financials: f2,
      market: marketCtx,
    });

    const winner = score1.score >= score2.score ? t1 : t2;
    const line = (
      t: string,
      info: typeof info1,
      price: typeof p1,
      fin: typeof f1,
      ind: typeof ind1,
      news: typeof news1,
      scr: { score: number; decision: (typeof score1)['decision'] }
    ) =>
      `${t} ${info?.nameAr ?? t}: سعر ${price?.price ?? '—'} | التقييم المحسوب=${scr.score} القرار=${DECISION_LABELS_AR[scr.decision]} | P/E ${fin.pe ?? '—'} ROE ${fin.roe != null ? (fin.roe * 100).toFixed(0) + '%' : '—'} | ${ind.trend} RSI ${ind.rsi14 ?? '—'} | أخبار: ${news.length ? news.slice(0, 2).map((n) => n.title).join('; ') : '—'}`;

    const prompt = `${line(t1, info1, p1, f1, ind1, news1, score1)}\n${line(t2, info2, p2, f2, ind2, news2, score2)}\nسوق: ${marketCtx.marketStatus} EGX30: ${marketCtx.egx30?.price ?? '—'} USD/EGP: ${marketCtx.usdEgp ?? '—'}\nالفائز محسوب آلياً: ${winner} (درجته أعلى). اشرح لماذا بناءً على الأرقام فقط. لا تغيّر winner ولا الـ scores. JSON فقط.`;

    const raw = await runAnalysisEngine(EXPLAIN_COMPARE_SYSTEM, prompt, ANALYSIS_MAX_TOKENS_COMPARE);
    const aiCompare = parseAnalysisJson(raw) as Record<string, unknown>;

    const baseComparison: Record<string, unknown> = typeof aiCompare === 'object' && aiCompare !== null ? aiCompare : {};
    const stock1Base = typeof aiCompare.stock1 === 'object' && aiCompare.stock1 !== null ? (aiCompare.stock1 as Record<string, unknown>) : {};
    const stock2Base = typeof aiCompare.stock2 === 'object' && aiCompare.stock2 !== null ? (aiCompare.stock2 as Record<string, unknown>) : {};

    const stock1FundamentalBase =
      typeof (stock1Base.fundamental as Record<string, unknown> | undefined) === 'object' && stock1Base.fundamental !== null
        ? (stock1Base.fundamental as Record<string, unknown>)
        : {};
    const stock1TechnicalBase =
      typeof (stock1Base.technical as Record<string, unknown> | undefined) === 'object' && stock1Base.technical !== null
        ? (stock1Base.technical as Record<string, unknown>)
        : {};
    const stock2FundamentalBase =
      typeof (stock2Base.fundamental as Record<string, unknown> | undefined) === 'object' && stock2Base.fundamental !== null
        ? (stock2Base.fundamental as Record<string, unknown>)
        : {};
    const stock2TechnicalBase =
      typeof (stock2Base.technical as Record<string, unknown> | undefined) === 'object' && stock2Base.technical !== null
        ? (stock2Base.technical as Record<string, unknown>)
        : {};

    const comparison = {
      ...baseComparison,
      winner,
      winnerReason:
        aiCompare.winnerReason ||
        (winner === t1
          ? `درجة ${t1} (${score1.score}) أعلى من درجة ${t2} (${score2.score}).`
          : `درجة ${t2} (${score2.score}) أعلى من درجة ${t1} (${score1.score}).`),
      stock1: {
        ...stock1Base,
        ticker: t1,
        name: info1?.nameAr ?? t1,
        score: score1.score,
        verdictBadge: DECISION_LABELS_AR[score1.decision],
        technical_score: score1.technical_score,
        momentum_score: score1.momentum_score,
        fundamental_score: score1.fundamental_score,
        market_score: score1.market_score,
        macro_score: score1.macro_score,
        risk_score: score1.risk_score,
        fundamental: {
          ...stock1FundamentalBase,
          score: score1.fundamental_score,
        },
        technical: {
          ...stock1TechnicalBase,
          score: score1.technical_score,
        },
      },
      stock2: {
        ...stock2Base,
        ticker: t2,
        name: info2?.nameAr ?? t2,
        score: score2.score,
        verdictBadge: DECISION_LABELS_AR[score2.decision],
        technical_score: score2.technical_score,
        momentum_score: score2.momentum_score,
        fundamental_score: score2.fundamental_score,
        market_score: score2.market_score,
        macro_score: score2.macro_score,
        risk_score: score2.risk_score,
        fundamental: {
          ...stock2FundamentalBase,
          score: score2.fundamental_score,
        },
        technical: {
          ...stock2TechnicalBase,
          score: score2.technical_score,
        },
      },
    };
    await setCachedAnalysis(compareCacheKey, comparison, 'claude');
    const saved = await AnalysisRepository.create({
      userId,
      ticker: `${t1}|${t2}`,
      content: JSON.stringify(comparison),
    });
    return { comparison, id: saved.id };
  },

  /** تحليل سريع — صفر tokens، < 1 ثانية */
  async quickAnalysis(ticker: string) {
    const [priceResult, historyResult, financialsResult] = await Promise.allSettled([
      getPriceForAnalysis(ticker),
      getStockHistory(ticker, '3mo').catch(() => []),
      getFinancials(ticker),
    ]);

    const price = priceResult.status === 'fulfilled' ? priceResult.value : null;
    const history = historyResult.status === 'fulfilled' ? historyResult.value : [];
    const financials = financialsResult.status === 'fulfilled' ? financialsResult.value : null;

    return generateQuickAnalysis(ticker, price, history, financials);
  },

  /** توصيات شخصية بناءً على المحفظة وملف المستخدم — نقطة واحدة */
  async recommendations(
    userId: string,
    _body?: { riskTolerance?: string; investmentHorizon?: number; interestedSectors?: string[] }
  ): Promise<{ recommendations: unknown; id: string }> {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);
    await atomicConsumeQuota(userId, 1);

    const dataMs = ANALYSIS_DATA_GATHER_TIMEOUT_MS;
    const portfolioFallback: [Array<{ ticker: string; shares: number; avgPrice: number }>, number] = [[], 0];
    const [portfolioRows, profile, marketCtx] = await Promise.all([
      withTimeout(
        PortfolioRepository.findByUser(userId).then(([list, n]) => [
          list.map((h) => ({ ticker: h.ticker, shares: h.shares, avgPrice: h.avgPrice })),
          n,
        ] as [Array<{ ticker: string; shares: number; avgPrice: number }>, number]),
        dataMs,
        portfolioFallback
      ),
      withTimeout(
        UserRepository.findUnique({
          where: { id: userId },
          select: {
            riskTolerance: true,
            investmentHorizon: true,
            interestedSectors: true,
            monthlyBudget: true,
            shariaMode: true,
            investorProfile: true,
            onboardingCompleted: true,
          },
        }),
        dataMs,
        null
      ),
      withTimeout(getMarketContext().catch(() => defaultMarketCtx), dataMs, defaultMarketCtx),
    ]);

    const portfolioList = Array.isArray(portfolioRows[0]) ? portfolioRows[0] : [];
    const risk = _body?.riskTolerance ?? profile?.riskTolerance ?? 'moderate';
    const horizon = _body?.investmentHorizon ?? profile?.investmentHorizon ?? 5;
    let sectors: string[] = [];
    try {
      sectors = _body?.interestedSectors ?? (profile?.interestedSectors ? JSON.parse(profile.interestedSectors) : []) ?? [];
    } catch {
      // ignore
    }
    const tickers = portfolioList.map((h) => h.ticker);
    const budget = profile?.monthlyBudget ?? 0;
    const shariaMode = profile?.shariaMode ?? false;
    const investorProfile = profile?.investorProfile ?? null;

    let portfolioData = '';
    let portfolioScoresBlock = '';
    const toScore = portfolioList.slice(0, 5);
    if (toScore.length > 0) {
      const quotes = await marketDataService.getQuotes(tickers);
      portfolioData = portfolioList
        .map((h) => {
          const q = quotes.get(h.ticker);
          const currentPrice = q?.price ?? h.avgPrice;
          const gainPct = (((currentPrice - h.avgPrice) / h.avgPrice) * 100).toFixed(1);
          return `- ${h.ticker}: ${h.shares} سهم × ${h.avgPrice} ج.م (الحالي: ${currentPrice} ج.م، ${Number(gainPct) >= 0 ? '+' : ''}${gainPct}%)`;
        })
        .join('\n');

      const scorePromises = toScore.map(async (h) => {
        const [hist, fin] = await Promise.all([
          withTimeout(getStockHistory(h.ticker, '3mo').catch(() => []), 8000, []),
          withTimeout(getFinancials(h.ticker).catch(() => nullFinancials), 8000, nullFinancials),
        ]);
        const q = quotes.get(h.ticker);
        const price = q?.price ?? (hist.length > 0 ? hist[hist.length - 1].close : 0);
        const ind = calculateIndicators(hist);
        const result = computeScore({
          price,
          changePercent: q?.changePercent ?? 0,
          volume: hist.length > 0 ? hist[hist.length - 1].volume : null,
          history: hist,
          indicators: ind,
          financials: fin ?? nullFinancials,
          market: marketCtx,
        });
        return { ticker: h.ticker, score: result.score, decision: result.decision };
      });
      const scoreResults = await Promise.all(scorePromises);
      portfolioScoresBlock = `تقييم محسوب آلياً (نفس محرك التحليل — لا تخالفه): ${scoreResults.map((r) => `${r.ticker}=${r.score} (${DECISION_LABELS_AR[r.decision]})`).join('؛ ')}.`;
    }

    const systemWithSharia = shariaMode
      ? RECOMMENDATIONS_SYSTEM.replace('ردك JSON فقط:', 'المستخدم يريد استثمارات متوافقة مع الشريعة فقط — لا بنوك تقليدية ولا شركات خمور ولا تبغ.\n\nردك JSON فقط:')
      : RECOMMENDATIONS_SYSTEM;

    const shariaNote = shariaMode ? ' شريعة فقط.' : '';
    const prompt = `ملف: مخاطر ${risk === 'conservative' ? 'محافظ' : risk === 'aggressive' ? 'مغامر' : 'متوازن'} | أفق ${horizon}س | ميزانية ${budget > 0 ? budget.toLocaleString() + ' ج' : '—'}${shariaNote} | قطاعات ${sectors.length ? sectors.slice(0, 3).join(',') : '—'}
محفظة: ${portfolioData || 'فارغة'}
${portfolioScoresBlock ? portfolioScoresBlock + '\n' : ''}سوق: ${marketCtx.marketStatus} EGX30: ${marketCtx.egx30?.price ?? '—'} USD/EGP: ${marketCtx.usdEgp ?? '—'}
توصيات EGX: سعر مستهدف، وقف خسارة، سبب جملة واحدة. عند التوصية على أسهم المحفظة استند إلى التقييم المحسوب أعلاه. JSON فقط.`;

    const raw = await runAnalysisEngine(systemWithSharia, prompt, ANALYSIS_MAX_TOKENS_RECOMMENDATIONS);
    const recommendations = parseAnalysisJson(raw);
    const saved = await AnalysisRepository.create({
      userId,
      ticker: '_recommendations',
      content: JSON.stringify(recommendations),
    });
    return { recommendations, id: saved.id };
  },
};
