import { getCachedAnalysis, setCachedAnalysis, singleKey, personalKey } from '../../lib/analysisCache.ts';
import { getAnalysisNewsCutoff, getAnalysisSessionDateString } from '../../lib/cairo-date.ts';
import { AnalysisRepository } from '../../repositories/analysis.repository.ts';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../../lib/achievementCheck.ts';
import { AppError } from '../../lib/errors.ts';
import { EGX_STOCKS } from '../../../src/lib/egxStocks.ts';
import {
  nullFinancials,
  defaultMarketCtx,
  atomicConsumeQuota,
  withTimeout,
  getPriceForAnalysis,
  runAnalysisEngine,
  parseAnalysisJson,
  ANALYSIS_DATA_GATHER_TIMEOUT_MS,
  ANALYSIS_MAX_TOKENS_SINGLE,
  EXPLAIN_SINGLE_SYSTEM,
  getStockHistory,
  getFinancials,
  getStockNews,
  getMarketContext,
  calculateIndicators,
  computeScore,
  DECISION_LABELS_AR,
} from './analysis.helpers.ts';

export async function createAnalysis(
  userId: number,
  ticker: string
): Promise<{ analysis: unknown; id: string; newUnseenAchievements: string[] }> {
  if (!userId) throw new AppError('UNAUTHORIZED', 401);

  const userCacheKey = personalKey(userId, ticker);
  const userCached = await getCachedAnalysis<unknown>(userCacheKey);
  if (userCached) {
    const saved = await AnalysisRepository.create({
      userId,
      ticker,
      content: JSON.stringify(userCached),
    });
    const completedBefore = await getCompletedAchievementIds(userId);
    const newAchievements = await addNewlyUnlockedAchievements(userId, completedBefore);
    return { analysis: userCached, id: saved.id, newUnseenAchievements: newAchievements };
  }

  const cacheKey = singleKey(ticker);
  const globalCached = await getCachedAnalysis<unknown>(cacheKey);
  if (globalCached) {
    await setCachedAnalysis(userCacheKey, globalCached, 'cache');
    const saved = await AnalysisRepository.create({
      userId,
      ticker,
      content: JSON.stringify(globalCached),
    });
    const completedBefore = await getCompletedAchievementIds(userId);
    const newAchievements = await addNewlyUnlockedAchievements(userId, completedBefore);
    return { analysis: globalCached, id: saved.id, newUnseenAchievements: newAchievements };
  }

  const completedBefore = await getCompletedAchievementIds(userId);

  const stockInfo = EGX_STOCKS.find((s) => s.ticker.toUpperCase() === ticker.toUpperCase());
  const nameAr = stockInfo?.nameAr ?? ticker;
  const nameEn = stockInfo?.nameEn ?? ticker;
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
      ? news.slice(0, 5).map((n) => n.title).join(' | ')
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
  // لو وصلنا هنا يبقى استدعاء الـ AI نجح، دلوقتي نخصم من الكوتا
  await atomicConsumeQuota(userId, 1);
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
  await setCachedAnalysis(userCacheKey, analysisJson, 'claude');

  const analysisObj = analysisJson as { priceTarget?: { current?: number; base?: number; targetBase?: number; low?: number; high?: number; stopLoss?: number }; verdictBadge?: string };
  const pt = analysisObj.priceTarget;
  const trackData = {
    priceAtAnalysis: priceData?.price ?? (pt?.current != null ? Number(pt.current) : undefined),
    targetPrice:
      pt?.targetBase != null ? Number(pt.targetBase) : pt?.base != null ? Number(pt.base) : pt?.high != null ? Number(pt.high) : undefined,
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
}
