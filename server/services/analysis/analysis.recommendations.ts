import { PortfolioRepository } from '../../repositories/portfolio.repository.ts';
import { UserRepository } from '../../repositories/user.repository.ts';
import { AnalysisRepository } from '../../repositories/analysis.repository.ts';
import { AppError } from '../../lib/errors.ts';
import { marketDataService } from '../market-data/market-data.service.ts';
import {
  nullFinancials,
  defaultMarketCtx,
  atomicConsumeQuota,
  withTimeout,
  runAnalysisEngine,
  parseAnalysisJson,
  ANALYSIS_DATA_GATHER_TIMEOUT_MS,
  ANALYSIS_MAX_TOKENS_RECOMMENDATIONS,
  RECOMMENDATIONS_SYSTEM,
  getStockHistory,
  getFinancials,
  getMarketContext,
  calculateIndicators,
  computeScore,
  DECISION_LABELS_AR,
} from './analysis.helpers.ts';

export async function recommendationsAnalysis(
  userId: number,
  _body?: { riskTolerance?: string; investmentHorizon?: number; interestedSectors?: string[] }
): Promise<{ recommendations: unknown; id: string }> {
  if (!userId) throw new AppError('UNAUTHORIZED', 401);

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
  // نخصم الكوتا فقط بعد نجاح استدعاء الـ AI
  await atomicConsumeQuota(userId, 1);
  const recommendations = parseAnalysisJson(raw);
  const saved = await AnalysisRepository.create({
    userId,
    ticker: '_recommendations',
    content: JSON.stringify(recommendations),
  });
  return { recommendations, id: saved.id };
}
