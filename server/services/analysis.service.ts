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

/** يستدعي محرك التحليل الافتراضي (حالياً Claude) للحصول على أفضل نتيجة. */
async function runAnalysisEngine(system: string, userMessage: string, maxTokens = 4000): Promise<string> {
  if (!process.env.CLAUDE_API_KEY) {
    throw new AppError('SERVICE_UNAVAILABLE', 503, 'خدمة التحليل غير متاحة حالياً. حاول لاحقاً.');
  }
  try {
    const { text } = await withRetry(
      () => analysisEngine.generate({ systemPrompt: system, userMessage, maxTokens }),
      { maxAttempts: 2, baseDelayMs: 2000 }
    );
    return text;
  } catch (err) {
    const msg = (err as Error)?.message ?? '';
    logger.error('Analysis engine error', { error: msg });

    if (msg.includes('rate') || msg.includes('429')) {
      throw new AppError('RATE_LIMITED', 429, 'خدمة التحليل مشغولة حالياً. حاول بعد دقيقة.');
    }
    if (msg.includes('timeout') || msg.includes('ECONNABORTED') || msg.includes('504') || msg.includes('abort')) {
      throw new AppError('ANALYSIS_TIMEOUT', 504, 'التحليل أخد وقت طويل. حاول تاني.');
    }
    throw new AppError('ANALYSIS_FAILED', 502, msg || 'فشل في الحصول على التحليل. حاول تاني.');
  }
}

function parseAnalysisJson(rawText: string): unknown {
  try {
    return JSON.parse(rawText);
  } catch {
    // ignore
  }

  const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // ignore
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const extracted = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(extracted);
    } catch {
      // ignore
    }
  }

  logger.warn('Could not parse Claude response as JSON — returning raw text as summary');
  return {
    summary: rawText.slice(0, 500),
    verdict: 'غير متاح — حاول تاني',
    disclaimer: 'هذا التحليل للأغراض التعليمية فقط',
  };
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
    const completedBefore = await getCompletedAchievementIds(userId);

    const [priceResult, historyResult, financialsResult, newsResult, marketCtxResult] = await Promise.allSettled([
      getPriceForAnalysis(ticker),
      getStockHistory(ticker, '6mo').catch(() => []),
      getFinancials(ticker),
      getStockNews(ticker).catch(() => []),
      getMarketContext().catch(() => ({ egx30: null, usdEgp: null, marketStatus: 'غير متاح', timestamp: new Date().toISOString() })),
    ]);

    const priceData = priceResult.status === 'fulfilled' ? priceResult.value : null;
    const history = historyResult.status === 'fulfilled' ? historyResult.value : [];
    const financials =
      financialsResult.status === 'fulfilled' && financialsResult.value
        ? financialsResult.value
        : nullFinancials;
    const news = newsResult.status === 'fulfilled' ? (newsResult.value as Array<{ title: string }>) : [];
    const marketCtx =
      marketCtxResult.status === 'fulfilled'
        ? marketCtxResult.value
        : { egx30: null, usdEgp: null, marketStatus: 'غير متاح', timestamp: new Date().toISOString() };

    const indicators = calculateIndicators(history);
    const stockInfo = EGX_STOCKS.find((s) => s.ticker.toUpperCase() === ticker.toUpperCase());
    const nameAr = stockInfo?.nameAr ?? ticker;
    const nameEn = stockInfo?.nameEn ?? ticker;

    const priceBlock = priceData
      ? `السعر الحالي: ${priceData.price} جنيه\nالتغير: ${priceData.changePercent}%\nالحجم: ${priceData.volume ?? '—'}`
      : 'السعر: ابحث عنه';

    const technicalBlock =
      indicators.rsi14 != null
        ? `
═══ التحليل الفني (محسوب من بيانات حقيقية) ═══
الاتجاه: ${indicators.trend}
RSI(14): ${indicators.rsi14}
SMA(20): ${indicators.sma20 ?? '—'} | SMA(50): ${indicators.sma50 ?? '—'} | SMA(200): ${indicators.sma200 ?? '—'}
السعر مقابل SMA200: ${indicators.priceVsSma200}
MACD: ${indicators.macd ?? '—'} | Signal: ${indicators.macdSignal ?? '—'}
Bollinger: ${indicators.bollingerLower ?? '—'} — ${indicators.bollingerUpper ?? '—'}
ATR(14): ${indicators.atr14 ?? '—'}
VWAP(20): ${indicators.vwap ?? '—'}
الدعم: ${indicators.support ?? '—'} | المقاومة: ${indicators.resistance ?? '—'}
الحجم اليوم: ${indicators.lastVolume?.toLocaleString() ?? '—'} | متوسط 20 يوم: ${indicators.avgVolume20?.toLocaleString() ?? '—'}
`
        : 'المؤشرات الفنية: غير متاحة — ابحث عنها';

    const fundamentalBlock = `
═══ التحليل الأساسي ═══
P/E: ${financials.pe != null ? financials.pe.toFixed(2) : 'ابحث عنه'} | Forward P/E: ${financials.forwardPe != null ? financials.forwardPe.toFixed(2) : '—'}
EPS: ${financials.eps != null ? financials.eps.toFixed(2) : '—'}
ROE: ${financials.roe != null ? (financials.roe * 100).toFixed(2) + '%' : 'ابحث عنه'}
ROA: ${financials.roa != null ? (financials.roa * 100).toFixed(2) + '%' : '—'}
هامش الربح: ${financials.profitMargin != null ? (financials.profitMargin * 100).toFixed(2) + '%' : 'ابحث عنه'}
هامش التشغيل: ${financials.operatingMargin != null ? (financials.operatingMargin * 100).toFixed(2) + '%' : '—'}
الإيرادات: ${financials.revenue != null ? financials.revenue.toLocaleString() : 'ابحث عنه'}
نمو الإيرادات: ${financials.revenueGrowth != null ? (financials.revenueGrowth * 100).toFixed(2) + '%' : '—'}
الدين/حقوق الملكية: ${financials.debtToEquity != null ? financials.debtToEquity.toFixed(2) : '—'}
التدفق النقدي الحر: ${financials.freeCashFlow != null ? financials.freeCashFlow.toLocaleString() : '—'}
توزيعات الأرباح: ${financials.dividendYield != null ? (financials.dividendYield * 100).toFixed(2) + '%' : '—'}
القيمة الدفترية: ${financials.bookValue != null ? financials.bookValue.toFixed(2) : '—'} | P/B: ${financials.priceToBook != null ? financials.priceToBook.toFixed(2) : '—'}
القيمة السوقية: ${financials.marketCap != null ? financials.marketCap.toLocaleString() : '—'}
Beta: ${financials.beta != null ? financials.beta.toFixed(2) : '—'}
`;

    const marketBlock = `
═══ سياق السوق ═══
حالة السوق: ${marketCtx.marketStatus}
EGX30: ${marketCtx.egx30 ? `${marketCtx.egx30.price} (${marketCtx.egx30.changePercent > 0 ? '+' : ''}${marketCtx.egx30.changePercent.toFixed(2)}%)` : 'ابحث عنه'}
USD/EGP: ${marketCtx.usdEgp != null ? marketCtx.usdEgp.toFixed(2) : 'ابحث عنه'}
`;

    const prompt = `
ابحث في الإنترنت عن أحدث بيانات السهم التالي من مصادر مالية موثوقة، ثم حلله وفق إطار الـ 42+ عامل.
البيانات أدناه محسوبة من بيانات حقيقية — استخدمها مباشرة ولا تتجاهلها. إذا كان أي حقل "ابحث عنه" فابحث عنه فعلاً.

═══ هوية السهم ═══
الرمز: ${ticker}
الشركة: ${nameAr} (${nameEn})
البورصة: EGX — Yahoo Finance: ${ticker}.CA

═══ السعر الحالي ═══
${priceBlock}

${fundamentalBlock}
${technicalBlock}
${marketBlock}

═══ الأخبار ═══
${news.length > 0 ? news.map((n) => '- ' + n.title).join('\n') : 'ابحث عن أحدث الأخبار'}

المطلوب: JSON فقط بالشكل المحدد في الـ system prompt.
`;

    const rawText = await runAnalysisEngine(SINGLE_ANALYSIS_SYSTEM, prompt, 5000);
    const analysisJson = parseAnalysisJson(rawText);

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

    const results = await Promise.allSettled([
      marketDataService.getQuotes([t1, t2]),
      getFinancials(t1).catch(() => nullFinancials),
      getFinancials(t2).catch(() => nullFinancials),
      getStockHistory(t1, '3mo').catch(() => []),
      getStockHistory(t2, '3mo').catch(() => []),
      getStockNews(t1).catch(() => []),
      getStockNews(t2).catch(() => []),
      getMarketContext().catch(() => defaultMarketCtx),
    ]);

    const quotes = results[0].status === 'fulfilled' ? results[0].value : new Map<string, { price: number; changePercent: number }>();
    const f1 = results[1].status === 'fulfilled' ? results[1].value : nullFinancials;
    const f2 = results[2].status === 'fulfilled' ? results[2].value : nullFinancials;
    const h1 = results[3].status === 'fulfilled' ? results[3].value : [];
    const h2 = results[4].status === 'fulfilled' ? results[4].value : [];
    const news1 = results[5].status === 'fulfilled' ? (results[5].value as Array<{ title: string }>) : [];
    const news2 = results[6].status === 'fulfilled' ? (results[6].value as Array<{ title: string }>) : [];
    const marketCtx = results[7].status === 'fulfilled' ? results[7].value : defaultMarketCtx;

    const ind1 = calculateIndicators(h1);
    const ind2 = calculateIndicators(h2);
    const p1 = quotes.get(t1);
    const p2 = quotes.get(t2);
    const info1 = EGX_STOCKS.find((s) => s.ticker.toUpperCase() === t1);
    const info2 = EGX_STOCKS.find((s) => s.ticker.toUpperCase() === t2);

    const system = COMPARE_SYSTEM;

    const buildStockBlock = (
      t: string,
      info: typeof info1,
      price: typeof p1,
      fin: typeof f1,
      ind: typeof ind1,
      news: typeof news1
    ) => `
═══ ${t} — ${info?.nameAr ?? t} ═══
السعر: ${price && price.price > 0 ? `${price.price} جنيه (${price.changePercent > 0 ? '+' : ''}${price.changePercent.toFixed(2)}%)` : 'غير متاح'}
P/E: ${fin.pe != null ? fin.pe.toFixed(2) : '—'} | ROE: ${fin.roe != null ? (fin.roe * 100).toFixed(1) + '%' : '—'} | هامش الربح: ${fin.profitMargin != null ? (fin.profitMargin * 100).toFixed(1) + '%' : '—'}
D/E: ${fin.debtToEquity != null ? fin.debtToEquity.toFixed(2) : '—'} | FCF: ${fin.freeCashFlow != null ? fin.freeCashFlow.toLocaleString() : '—'} | Div Yield: ${fin.dividendYield != null ? (fin.dividendYield * 100).toFixed(2) + '%' : '—'}
الاتجاه: ${ind.trend} | RSI: ${ind.rsi14 ?? '—'} | MACD: ${ind.macd ?? '—'}
SMA20: ${ind.sma20 ?? '—'} | SMA50: ${ind.sma50 ?? '—'} | الدعم: ${ind.support ?? '—'} | المقاومة: ${ind.resistance ?? '—'}
أخبار: ${news.length ? news.slice(0, 3).map((n) => n.title).join(' | ') : 'ابحث عن الأخبار'}
`;

    const prompt = `
${buildStockBlock(t1, info1, p1, f1, ind1, news1)}
${buildStockBlock(t2, info2, p2, f2, ind2, news2)}

سياق السوق: ${marketCtx.marketStatus} | EGX30: ${marketCtx.egx30?.price ?? '—'} | USD/EGP: ${marketCtx.usdEgp ?? '—'}

قارن بعمق واعطِ التوصية.
`;

    const raw = await runAnalysisEngine(system, prompt, 4000);
    const comparison = parseAnalysisJson(raw);
    await consumeQuota(userId, 2);
    const saved = await AnalysisRepository.create({
      userId,
      ticker: `${t1}|${t2}`,
      content: JSON.stringify(comparison),
    });
    return { comparison, id: saved.id };
  },

  /** توصيات شخصية بناءً على المحفظة وملف المستخدم — نقطة واحدة */
  async recommendations(
    userId: string,
    _body?: { riskTolerance?: string; investmentHorizon?: number; interestedSectors?: string[] }
  ): Promise<{ recommendations: unknown; id: string }> {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);
    await ensureQuota(userId, 1);

    const [portfolioResult, profileResult, marketCtxResult] = await Promise.allSettled([
      PortfolioRepository.findByUser(userId),
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
      getMarketContext().catch(() => defaultMarketCtx),
    ]);

    const portfolioList =
      portfolioResult.status === 'fulfilled'
        ? ((portfolioResult.value as [Array<{ ticker: string; shares: number; avgPrice: number }>, number])[0] ?? [])
        : [];
    const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
    const marketCtx = marketCtxResult.status === 'fulfilled' ? marketCtxResult.value : defaultMarketCtx;
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

    const prompt = `
═══ ملف المستخدم ═══
تحمل المخاطر: ${risk === 'conservative' ? 'محافظ' : risk === 'aggressive' ? 'مغامر' : 'متوازن'}
الأفق الزمني: ${horizon} سنوات
الميزانية الشهرية: ${budget > 0 ? budget.toLocaleString() + ' جنيه' : 'غير محدد'}
الشريعة: ${shariaMode ? 'نعم — متوافق مع الشريعة فقط' : 'لا قيود'}
قطاعات مهتم بها: ${sectors.length ? sectors.join(', ') : 'غير محدد'}
${investorProfile ? `بيانات الاستبيان: ${JSON.stringify(investorProfile)}` : ''}

═══ المحفظة الحالية ═══
${portfolioData || 'المحفظة فاضية — اقترح أسهم للبدء'}

═══ سياق السوق ═══
حالة السوق: ${marketCtx.marketStatus}
EGX30: ${marketCtx.egx30 ? `${marketCtx.egx30.price} (${marketCtx.egx30.changePercent > 0 ? '+' : ''}${marketCtx.egx30.changePercent.toFixed(2)}%)` : 'ابحث عنه'}
USD/EGP: ${marketCtx.usdEgp != null ? marketCtx.usdEgp.toFixed(2) : 'ابحث عنه'}

قدم 5-8 توصيات عملية محددة بأسعار مستهدفة ووقف خسارة.
`;

    const raw = await runAnalysisEngine(systemWithSharia, prompt, 5000);
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
