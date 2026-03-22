import { getCachedAnalysis, setCachedAnalysis, compareKey, personalCompareKey } from '../../lib/analysisCache.ts';
import type { AnalysisMode } from '../../lib/analysisCache.ts';
import { getAnalysisNewsCutoff } from '../../lib/cairo-date.ts';
import { AnalysisRepository } from '../../repositories/analysis.repository.ts';
import { AppError } from '../../lib/errors.ts';
import { EGX_STOCKS } from '../../lib/egxStocks.ts';
import { marketDataService } from '../market-data/market-data.service.ts';
import {
  nullFinancials,
  defaultMarketCtx,
  atomicConsumeQuota,
  preCheckQuota,
  tryAcquireAnalysisCooldown,
  releaseAnalysisCooldown,
  withTimeout,
  runAnalysisEngine,
  parseAnalysisJson,
  ANALYSIS_DATA_GATHER_TIMEOUT_MS,
  ANALYSIS_MAX_TOKENS_COMPARE,
  ANALYSIS_MAX_TOKENS_COMPARE_PRO,
  EXPLAIN_COMPARE_SYSTEM,
  EXPLAIN_COMPARE_PRO_SYSTEM,
  getFinancials,
  getStockHistory,
  getStockNews,
  getMarketContext,
  calculateIndicators,
  computeScore,
  DECISION_LABELS_AR,
} from './analysis.helpers.ts';
import type { ScoringResult } from '../../lib/scoringEngine.ts';
import type { IndicatorsInput } from '../../lib/scoringEngine.ts';

type FinRow = Awaited<ReturnType<typeof getFinancials>>;
type NewsItem = { title: string };

function buildStockDataBlock(
  ticker: string,
  info: (typeof EGX_STOCKS)[number] | undefined,
  price: number,
  changePercent: number,
  fin: NonNullable<FinRow>,
  ind: IndicatorsInput,
  news: NewsItem[],
  scr: ScoringResult
): string {
  const fundLines: string[] = [];
  if (fin.pe != null) fundLines.push(`P/E: ${fin.pe.toFixed(2)}`);
  if (fin.roe != null) fundLines.push(`ROE: ${(fin.roe * 100).toFixed(1)}%`);
  if (fin.profitMargin != null) fundLines.push(`هامش: ${(fin.profitMargin * 100).toFixed(1)}%`);
  if (fin.debtToEquity != null) fundLines.push(`D/E: ${fin.debtToEquity.toFixed(2)}`);
  if (fin.eps != null) fundLines.push(`EPS: ${fin.eps.toFixed(2)}`);
  if (fin.dividendYield != null) fundLines.push(`توزيعات: ${(fin.dividendYield * 100).toFixed(2)}%`);
  if (fin.revenueGrowth != null) fundLines.push(`نمو: ${(fin.revenueGrowth * 100).toFixed(1)}%`);
  if (fin.freeCashFlow != null) fundLines.push(`FCF: ${fin.freeCashFlow.toLocaleString()}`);
  if (fin.priceToBook != null) fundLines.push(`P/B: ${fin.priceToBook.toFixed(2)}`);
  if (fin.roa != null) fundLines.push(`ROA: ${(fin.roa * 100).toFixed(1)}%`);

  const techLines: string[] = [];
  if (ind.rsi14 != null) techLines.push(`RSI: ${ind.rsi14}`);
  if (ind.trend) techLines.push(`اتجاه: ${ind.trend}`);
  if (ind.macd != null) techLines.push(`MACD: ${ind.macd}`);
  if (ind.macdSignal != null) techLines.push(`Signal: ${ind.macdSignal}`);
  if (ind.sma20 != null) techLines.push(`SMA20: ${ind.sma20}`);
  if (ind.sma50 != null) techLines.push(`SMA50: ${ind.sma50}`);
  if (ind.sma200 != null) techLines.push(`SMA200: ${ind.sma200}`);
  if (ind.support != null) techLines.push(`دعم: ${ind.support}`);
  if (ind.resistance != null) techLines.push(`مقاومة: ${ind.resistance}`);
  if (ind.atr14 != null) techLines.push(`ATR: ${ind.atr14}`);
  if (ind.bollingerUpper != null && ind.bollingerLower != null)
    techLines.push(`BB: ${ind.bollingerLower.toFixed(1)}–${ind.bollingerUpper.toFixed(1)}`);
  if (ind.lastVolume != null && ind.avgVolume20 != null)
    techLines.push(`حجم: ${ind.lastVolume.toLocaleString()} (متوسط: ${ind.avgVolume20.toLocaleString()})`);

  const scoreBlock = `أسكور: ${scr.score} | فني: ${scr.technical_score} | زخم: ${scr.momentum_score} | أساسي: ${scr.fundamental_score} | سوق: ${scr.market_score} | اقتصاد: ${scr.macro_score} | مخاطر: ${scr.risk_score}`;

  return `== ${ticker} — ${info?.nameAr ?? ticker} (${info?.nameEn ?? ''}) ==
${scoreBlock} | قرار: ${DECISION_LABELS_AR[scr.decision]}
سعر: ${price} ج | تغير: ${changePercent > 0 ? '+' : ''}${changePercent}%
أساسي: ${fundLines.length ? fundLines.join(' | ') : 'غير متاح'}
فني: ${techLines.length ? techLines.join(' | ') : 'غير متاح'}
أخبار: ${news.length ? news.slice(0, 3).map((n) => n.title).join(' | ') : 'لا أخبار'}`;
}

export async function compareAnalysis(
  userId: number,
  ticker1: string,
  ticker2: string,
  mode: AnalysisMode = 'beginner'
): Promise<{ comparison: unknown; id: string }> {
  if (!userId) throw new AppError('UNAUTHORIZED', 401);
  if (!ticker1 || !ticker2) throw new AppError('VALIDATION_ERROR', 400);
  const t1 = ticker1.trim().toUpperCase();
  const t2 = ticker2.trim().toUpperCase();
  if (t1 === t2) throw new AppError('SAME_STOCK_COMPARE', 400);

  const userCompareKey = personalCompareKey(userId, t1, t2, mode);
  const userCachedCompare = await getCachedAnalysis<unknown>(userCompareKey);
  if (userCachedCompare) {
    const saved = await AnalysisRepository.create({
      userId,
      ticker: `${t1}|${t2}`,
      content: JSON.stringify(userCachedCompare),
    });
    return { comparison: userCachedCompare, id: saved.id };
  }

  const compareCacheKey = compareKey(t1, t2, mode);
  const globalCachedCompare = await getCachedAnalysis<unknown>(compareCacheKey);
  if (globalCachedCompare) {
    await setCachedAnalysis(userCompareKey, globalCachedCompare, 'cache');
    const saved = await AnalysisRepository.create({
      userId,
      ticker: `${t1}|${t2}`,
      content: JSON.stringify(globalCachedCompare),
    });
    return { comparison: globalCachedCompare, id: saved.id };
  }

  // فحص الكوتا والـ cooldown قبل استدعاء الـ AI (المقارنة تستهلك 2 نقطة)
  await preCheckQuota(userId);
  const cooldownAcquired = await tryAcquireAnalysisCooldown(userId);
  if (!cooldownAcquired) {
    throw new AppError('ANALYSIS_COOLDOWN', 429, 'يرجى الانتظار دقيقة بين كل تحليل وآخر', {
      code: 'ANALYSIS_COOLDOWN',
      retryAfterSeconds: 60,
    });
  }

  const info1 = EGX_STOCKS.find((s) => s.ticker.toUpperCase() === t1);
  const info2 = EGX_STOCKS.find((s) => s.ticker.toUpperCase() === t2);
  const newsCutoff = getAnalysisNewsCutoff();
  const dataMs = ANALYSIS_DATA_GATHER_TIMEOUT_MS;

  const [quotes, f1, f2, h1, h2, news1, news2, marketCtx] = await Promise.all([
    withTimeout(marketDataService.getQuotes([t1, t2]), dataMs, new Map<string, { price: number; changePercent: number }>()),
    withTimeout(getFinancials(t1).catch(() => nullFinancials), dataMs, nullFinancials),
    withTimeout(getFinancials(t2).catch(() => nullFinancials), dataMs, nullFinancials),
    withTimeout(getStockHistory(t1, '6mo').catch(() => []), dataMs, []),
    withTimeout(getStockHistory(t2, '6mo').catch(() => []), dataMs, []),
    withTimeout(getStockNews(info1?.nameAr ?? t1, newsCutoff).catch(() => []), dataMs, [] as NewsItem[]),
    withTimeout(getStockNews(info2?.nameAr ?? t2, newsCutoff).catch(() => []), dataMs, [] as NewsItem[]),
    withTimeout(getMarketContext().catch(() => defaultMarketCtx), dataMs, defaultMarketCtx),
  ]);

  const ind1 = calculateIndicators(h1);
  const ind2 = calculateIndicators(h2);
  const p1 = quotes.get(t1);
  const p2 = quotes.get(t2);

  const price1 = p1?.price ?? (h1.length > 0 ? h1[h1.length - 1].close : 0);
  const price2 = p2?.price ?? (h2.length > 0 ? h2[h2.length - 1].close : 0);
  const chg1 = p1?.changePercent ?? 0;
  const chg2 = p2?.changePercent ?? 0;

  const score1 = computeScore({
    price: price1,
    changePercent: chg1,
    volume: h1.length > 0 ? h1[h1.length - 1].volume : null,
    history: h1,
    indicators: ind1,
    financials: f1,
    market: marketCtx,
  });
  const score2 = computeScore({
    price: price2,
    changePercent: chg2,
    volume: h2.length > 0 ? h2[h2.length - 1].volume : null,
    history: h2,
    indicators: ind2,
    financials: f2,
    market: marketCtx,
  });

  const winner = score1.score >= score2.score ? t1 : t2;

  const block1 = buildStockDataBlock(t1, info1, price1, chg1, f1 ?? nullFinancials, ind1, news1, score1);
  const block2 = buildStockDataBlock(t2, info2, price2, chg2, f2 ?? nullFinancials, ind2, news2, score2);

  const prompt = `${block1}

${block2}

سوق: ${marketCtx.marketStatus} | EGX30: ${marketCtx.egx30?.price ?? '—'} (${marketCtx.egx30 != null ? (marketCtx.egx30.changePercent > 0 ? '+' : '') + marketCtx.egx30.changePercent.toFixed(2) + '%' : '—'}) | USD/EGP: ${marketCtx.usdEgp ?? '—'}

الفائز الكلي محسوب آلياً: ${winner} (درجته أعلى — لا تغيّر winner ولا الـ scores). قارن بعمق وحدد الفائز لكل مدى زمني. JSON فقط.`;

  const systemPrompt = mode === 'professional' ? EXPLAIN_COMPARE_PRO_SYSTEM : EXPLAIN_COMPARE_SYSTEM;
  const maxTokens = mode === 'professional' ? ANALYSIS_MAX_TOKENS_COMPARE_PRO : ANALYSIS_MAX_TOKENS_COMPARE;

  let raw: string;
  try {
    raw = await runAnalysisEngine(systemPrompt, prompt, maxTokens);
  } catch (err) {
    await releaseAnalysisCooldown(userId);
    throw err;
  }
  // بعد نجاح استدعاء الـ AI فقط نخصم من الكوتا
  await atomicConsumeQuota(userId, 2);
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
    mode,
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
      fundamental: { ...stock1FundamentalBase, score: score1.fundamental_score },
      technical: { ...stock1TechnicalBase, score: score1.technical_score },
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
      fundamental: { ...stock2FundamentalBase, score: score2.fundamental_score },
      technical: { ...stock2TechnicalBase, score: score2.technical_score },
    },
  };
  await setCachedAnalysis(compareCacheKey, comparison, 'claude');
  await setCachedAnalysis(userCompareKey, comparison, 'claude');
  const saved = await AnalysisRepository.create({
    userId,
    ticker: `${t1}|${t2}`,
    content: JSON.stringify(comparison),
  });
  return { comparison, id: saved.id };
}
