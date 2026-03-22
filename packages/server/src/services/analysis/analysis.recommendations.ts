import { PortfolioRepository } from '../../repositories/portfolio.repository.ts';
import { UserRepository } from '../../repositories/user.repository.ts';
import { AnalysisRepository } from '../../repositories/analysis.repository.ts';
import { AppError } from '../../lib/errors.ts';
import { marketDataService } from '../market-data/market-data.service.ts';
import { prisma } from '../../lib/prisma.ts';
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

  // فحص الكوتا والـ cooldown قبل استدعاء الـ AI
  await preCheckQuota(userId);
  const cooldownAcquired = await tryAcquireAnalysisCooldown(userId);
  if (!cooldownAcquired) {
    throw new AppError('ANALYSIS_COOLDOWN', 429, 'يرجى الانتظار دقيقة بين كل تحليل وآخر', {
      code: 'ANALYSIS_COOLDOWN',
      retryAfterSeconds: 60,
    });
  }

  const dataMs = ANALYSIS_DATA_GATHER_TIMEOUT_MS;
  const portfolioFallback: [Array<{ ticker: string; shares: number; avgPrice: number }>, number] = [[], 0];

  const [portfolioRows, profile, marketCtx, goals, watchlistItems] = await Promise.all([
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
          fullName: true,
        },
      }),
      dataMs,
      null
    ),
    withTimeout(getMarketContext().catch(() => defaultMarketCtx), dataMs, defaultMarketCtx),
    withTimeout(
      prisma.goal.findMany({
        where: { userId, status: 'active' },
        select: { title: true, targetAmount: true, currentAmount: true, deadline: true, category: true },
        orderBy: { deadline: 'asc' },
        take: 5,
      }),
      dataMs,
      [] as Array<{ title: string; targetAmount: number; currentAmount: number; deadline: Date | null; category: string }>
    ),
    withTimeout(
      prisma.watchlist.findMany({
        where: { userId },
        select: { ticker: true, targetPrice: true, targetDirection: true },
        take: 10,
      }),
      dataMs,
      [] as Array<{ ticker: string; targetPrice: number | null; targetDirection: string | null }>
    ),
  ]);

  const portfolioList = Array.isArray(portfolioRows[0]) ? portfolioRows[0] : [];
  const risk = _body?.riskTolerance ?? profile?.riskTolerance ?? 'moderate';
  const horizon = _body?.investmentHorizon ?? profile?.investmentHorizon ?? 5;
  let sectors: string[] = [];
  try {
    sectors = (_body?.interestedSectors ?? profile?.interestedSectors ?? []) as string[];
  } catch {
    // ignore
  }
  const tickers = portfolioList.map((h) => h.ticker);
  const budget = profile?.monthlyBudget ?? 0;
  const shariaMode = profile?.shariaMode ?? false;
  const investorProfile = profile?.investorProfile;
  const firstName = (profile?.fullName ?? '').split(' ')[0] || null;

  // ── بناء بلوك المحفظة ──────────────────────────────────────────────────
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

  // ── بناء بلوك الأهداف ──────────────────────────────────────────────────
  let goalsBlock = '';
  if (goals.length > 0) {
    const lines = goals.map((g) => {
      const gap = g.targetAmount - g.currentAmount;
      const deadlineStr = g.deadline ? new Date(g.deadline).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short' }) : 'بدون موعد';
      const progressPct = g.targetAmount > 0 ? ((g.currentAmount / g.targetAmount) * 100).toFixed(0) : '0';
      return `- "${g.title}" (${g.category}): المستهدف ${g.targetAmount.toLocaleString()} ج — المحقق ${g.currentAmount.toLocaleString()} ج (${progressPct}%) — المتبقي ${gap.toLocaleString()} ج — الموعد: ${deadlineStr}`;
    });
    goalsBlock = `\nالأهداف المالية للمستخدم:\n${lines.join('\n')}`;
  }

  // ── بناء بلوك قائمة المراقبة ──────────────────────────────────────────
  let watchlistBlock = '';
  if (watchlistItems.length > 0) {
    const lines = watchlistItems.map((w) => {
      const targetInfo = w.targetPrice != null ? ` (هدف: ${w.targetPrice} ج — اتجاه: ${w.targetDirection ?? 'صعود'})` : '';
      return `- ${w.ticker}${targetInfo}`;
    });
    watchlistBlock = `\nقائمة المراقبة (أسهم يفكر فيها):\n${lines.join('\n')}`;
  }

  // ── بناء بلوك ملف المستثمر ──────────────────────────────────────────
  let profileBlock = '';
  if (investorProfile && typeof investorProfile === 'object') {
    profileBlock = `\nملف المستثمر من الأونبوردينج: ${JSON.stringify(investorProfile).slice(0, 300)}`;
  }

  const systemWithSharia = shariaMode
    ? RECOMMENDATIONS_SYSTEM.replace('ردك JSON فقط بدون نص خارجه.', 'المستخدم يريد استثمارات متوافقة مع الشريعة فقط — لا بنوك تقليدية ولا شركات خمور ولا تبغ.\nردك JSON فقط بدون نص خارجه.')
    : RECOMMENDATIONS_SYSTEM;

  const shariaNote = shariaMode ? ' شريعة فقط.' : '';
  const nameNote = firstName ? `المستثمر: ${firstName} | ` : '';
  const prompt = `${nameNote}مخاطر: ${risk === 'conservative' ? 'محافظ' : risk === 'aggressive' ? 'مغامر' : 'متوازن'} | أفق: ${horizon} سنوات | ميزانية: ${budget > 0 ? budget.toLocaleString() + ' ج/شهر' : '—'}${shariaNote} | قطاعات اهتمام: ${sectors.length ? sectors.slice(0, 5).join(', ') : '—'}
محفظة:
${portfolioData || 'فارغة'}
${portfolioScoresBlock ? portfolioScoresBlock + '\n' : ''}${goalsBlock}${watchlistBlock}${profileBlock}
سوق: ${marketCtx.marketStatus} | EGX30: ${marketCtx.egx30?.price ?? '—'} | USD/EGP: ${marketCtx.usdEgp ?? '—'}
قدّم توصيات شخصية مخصصة تماماً لهذا المستخدم. انظر قائمة المراقبة وقيّم كل سهم فيها. انظر الأهداف واحسب كم يحتاج. JSON فقط.`;

  let raw: string;
  try {
    raw = await runAnalysisEngine(systemWithSharia, prompt, ANALYSIS_MAX_TOKENS_RECOMMENDATIONS);
  } catch (err) {
    await releaseAnalysisCooldown(userId);
    throw err;
  }
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
