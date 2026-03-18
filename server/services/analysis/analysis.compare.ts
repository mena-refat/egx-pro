import { getCachedAnalysis, setCachedAnalysis, compareKey, personalCompareKey } from '../../lib/analysisCache.ts';
import { getAnalysisNewsCutoff } from '../../lib/cairo-date.ts';
import { AnalysisRepository } from '../../repositories/analysis.repository.ts';
import { AppError } from '../../lib/errors.ts';
import { EGX_STOCKS } from '../../../src/lib/egxStocks.ts';
import { marketDataService } from '../market-data/market-data.service.ts';
import {
  nullFinancials,
  defaultMarketCtx,
  atomicConsumeQuota,
  withTimeout,
  runAnalysisEngine,
  parseAnalysisJson,
  ANALYSIS_DATA_GATHER_TIMEOUT_MS,
  ANALYSIS_MAX_TOKENS_COMPARE,
  EXPLAIN_COMPARE_SYSTEM,
  getFinancials,
  getStockHistory,
  getStockNews,
  getMarketContext,
  calculateIndicators,
  computeScore,
  DECISION_LABELS_AR,
} from './analysis.helpers.ts';

export async function compareAnalysis(
  userId: string,
  ticker1: string,
  ticker2: string
): Promise<{ comparison: unknown; id: string }> {
  if (!userId) throw new AppError('UNAUTHORIZED', 401);
  if (!ticker1 || !ticker2) throw new AppError('VALIDATION_ERROR', 400);
  const t1 = ticker1.trim().toUpperCase();
  const t2 = ticker2.trim().toUpperCase();
  if (t1 === t2) throw new AppError('SAME_STOCK_COMPARE', 400);

  const userCompareKey = personalCompareKey(userId, t1, t2);
  const userCachedCompare = await getCachedAnalysis<unknown>(userCompareKey);
  if (userCachedCompare) {
    const saved = await AnalysisRepository.create({
      userId,
      ticker: `${t1}|${t2}`,
      content: JSON.stringify(userCachedCompare),
    });
    return { comparison: userCachedCompare, id: saved.id };
  }

  const compareCacheKey = compareKey(t1, t2);
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
