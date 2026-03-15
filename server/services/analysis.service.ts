import { getStockHistory, getFinancials } from '../lib/stockData.ts';
import { getStockNews } from '../lib/news.ts';
import { marketDataService } from './market-data/market-data.service.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import { PortfolioRepository } from '../repositories/portfolio.repository.ts';
import { AnalysisRepository } from '../repositories/analysis.repository.ts';
import { logger } from '../lib/logger.ts';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { getLimit } from '../lib/plan.ts';
import { AppError } from '../lib/errors.ts';
import { SINGLE_ANALYSIS_SYSTEM, COMPARE_SYSTEM, RECOMMENDATIONS_SYSTEM } from '../lib/analysisPrompts.ts';
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

/** يتحقق من الحصة فقط (بدون خصم). استخدم consumeQuota بعد نجاح العملية. */
async function ensureQuota(userId: string, pointsRequired: number): Promise<void> {
  const user = await UserRepository.getForBillingPlan(userId);
  if (!user) throw new AppError('UNAUTHORIZED', 401);
  const quota = getLimit(user, 'aiAnalysisPerMonth') as number;
  const now = new Date();
  let usedThisMonth = user.aiAnalysisUsedThisMonth ?? 0;
  const resetDate = user.aiAnalysisResetDate;
  if (resetDate == null || now >= resetDate) {
    usedThisMonth = 0;
    await UserRepository.update({
      where: { id: userId },
      data: { aiAnalysisUsedThisMonth: 0, aiAnalysisResetDate: getFirstDayOfNextMonth() },
    });
  }
  if (usedThisMonth + pointsRequired > quota) {
    throw new AppError('ANALYSIS_LIMIT_REACHED', 402, 'تم استنفاد حصة التحليلات لهذا الشهر', {
      code: 'ANALYSIS_LIMIT_REACHED',
      used: usedThisMonth,
      quota,
    });
  }
}

/** يخصم نقاط التحليل بعد نجاح العملية. */
async function consumeQuota(userId: string, points: number): Promise<void> {
  const user = await UserRepository.getForBillingPlan(userId);
  if (!user) return;
  const now = new Date();
  let used = user.aiAnalysisUsedThisMonth ?? 0;
  const resetDate = user.aiAnalysisResetDate;
  if (resetDate == null || now >= resetDate) {
    used = 0;
    await UserRepository.update({
      where: { id: userId },
      data: { aiAnalysisUsedThisMonth: 0, aiAnalysisResetDate: getFirstDayOfNextMonth() },
    });
  }
  await UserRepository.update({
    where: { id: userId },
    data: { aiAnalysisUsedThisMonth: used + points },
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
    await ensureQuota(userId, 1);

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

    const prompt = `سهم: ${ticker} — ${nameAr} (${nameEn}). EGX.
${priceBlock}
أساسي: ${fundLines.length > 0 ? fundLines.join(' | ') : 'غير متاح'}
فني: ${techLines.length > 0 ? techLines.join(' | ') : 'غير متاح'}
${marketLine}
أخبار: ${newsLine}

حلل من البيانات أعلاه فقط. اخرج JSON بالشكل المحدد في الـ system.`;

    const rawText = await runAnalysisEngine(SINGLE_ANALYSIS_SYSTEM, prompt, ANALYSIS_MAX_TOKENS_SINGLE);
    const analysisJson = parseAnalysisJson(rawText);

    await setCachedAnalysis(cacheKey, analysisJson, 'claude');

    const analysisObj = analysisJson as Record<string, unknown>;
    const pt = analysisObj.priceTarget as
      | { current?: number; base?: number; targetBase?: number; low?: number; high?: number; stopLoss?: number }
      | undefined;
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
      verdict: (analysisObj.verdictBadge ?? analysisObj.verdict ?? '') as string,
    };

    await consumeQuota(userId, 1);
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
    await ensureQuota(userId, 2);

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

    const system = COMPARE_SYSTEM;

    const line = (
      t: string,
      info: typeof info1,
      price: typeof p1,
      fin: typeof f1,
      ind: typeof ind1,
      news: typeof news1
    ) =>
      `${t} ${info?.nameAr ?? t}: سعر ${price?.price ?? '—'} | P/E ${fin.pe ?? '—'} ROE ${fin.roe != null ? (fin.roe * 100).toFixed(0) + '%' : '—'} | ${ind.trend} RSI ${ind.rsi14 ?? '—'} | أخبار: ${news.length ? news.slice(0, 2).map((n) => n.title).join('; ') : '—'}`;

    const prompt = `${line(t1, info1, p1, f1, ind1, news1)}\n${line(t2, info2, p2, f2, ind2, news2)}\nسوق: ${marketCtx.marketStatus} EGX30: ${marketCtx.egx30?.price ?? '—'} USD/EGP: ${marketCtx.usdEgp ?? '—'}\nقارن واعطِ التوصية. JSON فقط.`;

    const raw = await runAnalysisEngine(system, prompt, ANALYSIS_MAX_TOKENS_COMPARE);
    const comparison = parseAnalysisJson(raw);
    await setCachedAnalysis(compareCacheKey, comparison, 'claude');
    await consumeQuota(userId, 2);
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
    await ensureQuota(userId, 1);

    const dataMs = ANALYSIS_DATA_GATHER_TIMEOUT_MS;
    const [portfolioRows, profile, marketCtx] = await Promise.all([
      withTimeout(PortfolioRepository.findByUser(userId), dataMs, [[], 0] as [Array<{ ticker: string; shares: number; avgPrice: number }>, number]),
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
    if (tickers.length > 0) {
      const quotes = await marketDataService.getQuotes(tickers);
      portfolioData = portfolioList
        .map((h) => {
          const q = quotes.get(h.ticker);
          const currentPrice = q?.price ?? h.avgPrice;
          const gainPct = (((currentPrice - h.avgPrice) / h.avgPrice) * 100).toFixed(1);
          return `- ${h.ticker}: ${h.shares} سهم × ${h.avgPrice} ج.م (الحالي: ${currentPrice} ج.م، ${Number(gainPct) >= 0 ? '+' : ''}${gainPct}%)`;
        })
        .join('\n');
    }

    const systemWithSharia = shariaMode
      ? RECOMMENDATIONS_SYSTEM.replace('ردك JSON فقط:', 'المستخدم يريد استثمارات متوافقة مع الشريعة فقط — لا بنوك تقليدية ولا شركات خمور ولا تبغ.\n\nردك JSON فقط:')
      : RECOMMENDATIONS_SYSTEM;

    const shariaNote = shariaMode ? ' شريعة فقط.' : '';
    const prompt = `ملف: مخاطر ${risk === 'conservative' ? 'محافظ' : risk === 'aggressive' ? 'مغامر' : 'متوازن'} | أفق ${horizon}س | ميزانية ${budget > 0 ? budget.toLocaleString() + ' ج' : '—'}${shariaNote} | قطاعات ${sectors.length ? sectors.slice(0, 3).join(',') : '—'}
محفظة: ${portfolioData || 'فارغة'}
سوق: ${marketCtx.marketStatus} EGX30: ${marketCtx.egx30?.price ?? '—'} USD/EGP: ${marketCtx.usdEgp ?? '—'}
توصيات EGX: سعر مستهدف، وقف خسارة، سبب جملة واحدة. JSON فقط.`;

    const raw = await runAnalysisEngine(systemWithSharia, prompt, ANALYSIS_MAX_TOKENS_RECOMMENDATIONS);
    const recommendations = parseAnalysisJson(raw);
    await consumeQuota(userId, 1);
    const saved = await AnalysisRepository.create({
      userId,
      ticker: '_recommendations',
      content: JSON.stringify(recommendations),
    });
    return { recommendations, id: saved.id };
  },
};
