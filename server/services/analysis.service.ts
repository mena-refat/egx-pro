import { getStockHistory, getFinancials } from '../lib/stockData.ts';
import { getStockNews } from '../lib/news.ts';
import { marketDataService } from './market-data/market-data.service.ts';
import { prisma } from '../lib/prisma.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import { PortfolioRepository } from '../repositories/portfolio.repository.ts';
import { logger } from '../lib/logger.ts';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { getLimit } from '../lib/plan.ts';
import { AppError } from '../lib/errors.ts';
import { SINGLE_ANALYSIS_SYSTEM } from '../lib/analysisPrompts.ts';
import { analysisEngine } from './ai/index.ts';
import { EGX_STOCKS } from '../../src/lib/egxStocks.ts';

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
async function runAnalysisEngine(system: string, userMessage: string, maxTokens = 2000): Promise<string> {
  if (!process.env.CLAUDE_API_KEY) throw new AppError('SERVICE_UNAVAILABLE', 503);
  try {
    const { text } = await analysisEngine.generate({
      systemPrompt: system,
      userMessage,
      maxTokens,
    });
    return text;
  } catch (err) {
    logger.error('Analysis engine error', { error: (err as Error).message });
    throw new AppError('INTERNAL_ERROR', 500);
  }
}

function parseAnalysisJson(rawText: string): unknown {
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    logger.error('Failed to parse Claude JSON', { e });
    throw new AppError('INTERNAL_ERROR', 500);
  }
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

    const [priceData, , financials, news] = (await Promise.all([
      getPriceForAnalysis(ticker),
      getStockHistory(ticker, '3mo'),
      getFinancials(ticker),
      getStockNews(ticker),
    ])) as [
      { price: number; changePercent: number; volume: number | null } | null,
      unknown,
      { pe: number | null; roe: number | null; profitMargin: number | null; revenue: number | null } | null,
      Array<{ title: string }>,
    ];

    const stockInfo = EGX_STOCKS.find((s) => s.ticker.toUpperCase() === ticker.toUpperCase());
    const nameAr = stockInfo?.nameAr ?? ticker;
    const nameEn = stockInfo?.nameEn ?? ticker;

    const priceBlock = priceData
      ? `السعر الحالي: ${priceData.price} جنيه\nالتغير: ${priceData.changePercent}%\nالحجم: ${priceData.volume ?? '—'}`
      : 'السعر: ابحث عنه';

    const prompt = `
ابحث في الإنترنت عن أحدث بيانات السهم التالي من مصادر مالية موثوقة (مثل: mubasher.info، egx.com.eg، arabianbusiness.com، investing.com/ar، أي مصدر مالي متاح)، ثم حلله وفق إطار العوامل المذكور (أكثر من 70 عامل).
قدم shortTermOutlook وmediumTermOutlook وlongTermOutlook واضحة ومحددة.

═══ هوية السهم ═══
الرمز: ${ticker}
اسم الشركة (عربي): ${nameAr}
اسم الشركة (إنجليزي): ${nameEn}
البورصة: البورصة المصرية EGX — الرمز في Yahoo Finance: ${ticker}.CA

═══ بيانات المنصة (قد تكون ناقصة — ابحث عن الأحدث) ═══
${priceBlock}
P/E: ${financials?.pe ?? 'ابحث عنه'}
ROE: ${financials?.roe != null ? (financials.roe * 100).toFixed(2) + '%' : 'ابحث عنه'}
هامش الربح: ${financials?.profitMargin != null ? (financials.profitMargin * 100).toFixed(2) + '%' : 'ابحث عنه'}
الإيرادات: ${financials?.revenue ?? 'ابحث عنه'}

═══ الأخبار المتاحة ═══
${news.length > 0 ? news.map((n) => '- ' + n.title).join('\n') : 'ابحث عن أحدث الأخبار والإعلانات الخاصة بهذه الشركة'}

المطلوب: نفس شكل الـ JSON المحدد (summary, fundamental, technical, sentiment, verdict, priceTarget, shortTermOutlook, mediumTermOutlook, longTermOutlook, suitability, disclaimer).
`;

    const rawText = await runAnalysisEngine(SINGLE_ANALYSIS_SYSTEM, prompt, 5000);
    const analysisJson = parseAnalysisJson(rawText);

    await consumeQuota(userId, 1);
    const saved = await prisma.analysis.create({
      data: { userId, ticker, content: JSON.stringify(analysisJson) },
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
    if (!ticker1 || !ticker2 || ticker1 === ticker2) {
      throw new AppError('VALIDATION_ERROR', 400);
    }
    await ensureQuota(userId, 2);

    const [quotes, f1, f2, news1, news2] = await Promise.all([
      marketDataService.getQuotes([ticker1, ticker2]),
      getFinancials(ticker1),
      getFinancials(ticker2),
      getStockNews(ticker1),
      getStockNews(ticker2),
    ]);
    const p1 = quotes.get(ticker1);
    const p2 = quotes.get(ticker2);
    const line1 = p1 && p1.price > 0
      ? `السعر: ${p1.price} جنيه، التغير: ${p1.changePercent}%`
      : 'السعر: غير متوفر حالياً';
    const line2 = p2 && p2.price > 0
      ? `السعر: ${p2.price} جنيه، التغير: ${p2.changePercent}%`
      : 'السعر: غير متوفر حالياً';

    const system = `أنت محلل مالي خبير. قارن بين السهمين المذكورين من حيث: القوة النسبية، التحليل الأساسي، المخاطر، والفرص.
ردك JSON فقط بدون نص خارجي. الشكل:
{
  "summary": "ملخص مقارنة في 2–3 جمل",
  "ticker1": { "verdict": "شراء/انتظار/بيع", "strengths": ["..."], "weaknesses": ["..."] },
  "ticker2": { "verdict": "شراء/انتظار/بيع", "strengths": ["..."], "weaknesses": ["..."] },
  "winner": "TICKER1 أو TICKER2 أو تعادل",
  "reason": "سبب التفضيل",
  "disclaimer": "هذا التحليل للأغراض التعليمية فقط وليس توصية استثمارية"
}`;

    const prompt = `
السهم الأول: ${ticker1}
${line1}
P/E: ${f1.pe ?? '—'}, ROE: ${f1.roe != null ? (f1.roe * 100).toFixed(2) : '—'}%, هامش الربح: ${f1.profitMargin != null ? (f1.profitMargin * 100).toFixed(2) : '—'}%
أخبار: ${news1.length ? news1.slice(0, 3).map((n) => n.title).join(' | ') : '—'}

السهم الثاني: ${ticker2}
${line2}
P/E: ${f2.pe ?? '—'}, ROE: ${f2.roe != null ? (f2.roe * 100).toFixed(2) : '—'}%, هامش الربح: ${f2.profitMargin != null ? (f2.profitMargin * 100).toFixed(2) : '—'}%
أخبار: ${news2.length ? news2.slice(0, 3).map((n) => n.title).join(' | ') : '—'}

قارن واعطِ التوصية في الحقل winner و reason.
`;

    const raw = await runAnalysisEngine(system, prompt, 1500);
    const comparison = parseAnalysisJson(raw);
    await consumeQuota(userId, 2);
    const saved = await prisma.analysis.create({
      data: {
        userId,
        ticker: `${ticker1}|${ticker2}`,
        content: JSON.stringify(comparison),
      },
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

    const [[portfolioList], profile] = await Promise.all([
      PortfolioRepository.findByUser(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { riskTolerance: true, investmentHorizon: true, interestedSectors: true },
      }),
    ]);
    const risk = _body?.riskTolerance ?? profile?.riskTolerance ?? 'moderate';
    const horizon = _body?.investmentHorizon ?? profile?.investmentHorizon ?? 5;
    let sectors: string[] = [];
    try {
      sectors = _body?.interestedSectors ?? (profile?.interestedSectors ? JSON.parse(profile.interestedSectors) : []);
    } catch {
      // ignore invalid JSON
    }
    const tickers = (portfolioList ?? []).map((h: { ticker: string }) => h.ticker);

    const system = `أنت مستشار استثماري. بناءً على محفظة المستخدم وملفه (تحمل المخاطر، الأفق الزمني، القطاعات)، قدم توصيات شخصية قصيرة.
ردك JSON فقط:
{
  "summary": "ملخص توصياتك في 2–3 جمل",
  "recommendations": [
    { "ticker": "رمز", "action": "شراء/احتفاظ/بيع/مراقبة", "reason": "سبب مختصر" }
  ],
  "portfolioAdvice": "نصيحة عامة للمحفظة",
  "disclaimer": "هذا التحليل للأغراض التعليمية فقط وليس توصية استثمارية"
}`;

    const prompt = `
ملف المستخدم:
- تحمل المخاطر: ${risk}
- الأفق الزمني (سنوات): ${horizon}
- قطاعات مهتم بها: ${Array.isArray(sectors) ? sectors.join(', ') : sectors}

أسهم في المحفظة حالياً: ${tickers.length ? tickers.join(', ') : 'لا يوجد'}

قدم توصيات شخصية (توصيات array حتى لو المحفظة فاضية: اقترح أسهم أو تحركات).
`;

    const raw = await runAnalysisEngine(system, prompt, 1500);
    const recommendations = parseAnalysisJson(raw);
    await consumeQuota(userId, 1);
    const saved = await prisma.analysis.create({
      data: {
        userId,
        ticker: '_recommendations',
        content: JSON.stringify(recommendations),
      },
    });
    return { recommendations, id: saved.id };
  },
};
