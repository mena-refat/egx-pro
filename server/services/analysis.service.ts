import { getStockPrice, getStockHistory, getFinancials } from '../lib/yahoo.ts';
import { getStockNews } from '../lib/news.ts';
import { prisma } from '../lib/prisma.ts';
import { logger } from '../lib/logger.ts';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { isPro, FREE_LIMITS } from '../lib/plan.ts';
import { AppError } from '../lib/errors.ts';

function getFirstDayOfNextMonth(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const CLAUDE_SYSTEM = `أنت محلل مالي خبير متخصص في البورصة المصرية.
تحلل الأسهم بدقة عالية للمستثمر المصري العادي.

مهم جداً: ردك يكون JSON فقط بدون أي نص خارجه.
بدون backticks. بدون شرح. JSON فقط.

الشكل المطلوب بالضبط:
{
  "summary": "ملخص شامل للسهم في 3 جمل",
  "fundamental": {
    "outlook": "النظرة المستقبلية للشركة",
    "ratios": "تحليل المؤشرات المالية P/E وROE وهامش الربح",
    "verdict": "قوي / متوسط / ضعيف"
  },
  "technical": {
    "signal": "صاعد / هابط / محايد",
    "indicators": "تحليل RSI والمتوسطات المتحركة",
    "levels": "مستويات الدعم والمقاومة المهمة"
  },
  "sentiment": "تحليل تأثير الأخبار على السهم",
  "verdict": "شراء قوي / شراء / انتظار / بيع / بيع قوي",
  "priceTarget": {
    "low": 0,
    "base": 0,
    "high": 0
  },
  "suitability": "مناسب لمن يبحث عن...",
  "disclaimer": "هذا التحليل للأغراض التعليمية فقط وليس توصية استثمارية مرخصة"
}`;

export const AnalysisService = {
  async create(
    userId: string,
    ticker: string
  ): Promise<{ analysis: unknown; id: string; newUnseenAchievements: string[] }> {
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 401);
    }

    const now = new Date();
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

    if (!user) {
      throw new AppError('NOT_FOUND', 404);
    }

    const effectivePro = isPro(user);
    const quota = effectivePro ? Infinity : FREE_LIMITS.aiAnalysisPerMonth;

    let usedThisMonth = user.aiAnalysisUsedThisMonth ?? 0;
    const resetDate = user.aiAnalysisResetDate;
    if (resetDate == null || now >= resetDate) {
      usedThisMonth = 0;
      const nextReset = getFirstDayOfNextMonth();
      await prisma.user.update({
        where: { id: userId },
        data: { aiAnalysisUsedThisMonth: 0, aiAnalysisResetDate: nextReset },
      });
    }

    if (!effectivePro && usedThisMonth >= quota) {
      throw new AppError('ANALYSIS_LIMIT_REACHED', 402, 'هذه الميزة متاحة في Pro', {
        code: 'ANALYSIS_LIMIT_REACHED',
        plan: 'free',
        used: usedThisMonth,
        quota,
      });
    }

    const completedBefore = await getCompletedAchievementIds(userId);

    const [priceData, , financials, news] = (await Promise.all([
      getStockPrice(ticker),
      getStockHistory(ticker, '3mo'),
      getFinancials(ticker),
      getStockNews(ticker),
    ])) as [
      { price: number; changePercent: number; volume: number | null } | null,
      unknown,
      {
        pe: number | null;
        roe: number | null;
        profitMargin: number | null;
        revenue: number | null;
      } | null,
      Array<{ title: string }>,
    ];

    if (!priceData || !financials) {
      throw new AppError('NOT_FOUND', 404);
    }

    const prompt = `
      حلل السهم التالي وقدم تقرير شامل:
      
      ═══ بيانات السهم ═══
      الاسم: ${ticker}
      السعر: ${priceData.price} جنيه
      التغير: ${priceData.changePercent}%
      الحجم: ${priceData.volume}
      
      ═══ التحليل المالي ═══
      P/E: ${financials.pe ?? 'غير متوفر'}
      ROE: ${financials.roe != null ? (financials.roe * 100).toFixed(2) : 'غير متوفر'}%
      هامش الربح: ${financials.profitMargin != null ? (financials.profitMargin * 100).toFixed(2) : 'غير متوفر'}%
      الإيرادات: ${financials.revenue ?? 'غير متوفر'}
      
      ═══ آخر الأخبار ═══
      ${news.length > 0 ? news.map((n) => '- ' + n.title).join('\n') : 'لا توجد أخبار حديثة'}
      
      المطلوب:
      1. التحليل الفني (صاعد/هابط/محايد)
      2. التحليل الأساسي (الشركة قوية؟)
      3. تأثير الأخبار
      4. المخاطر الرئيسية
      5. التوصية: شراء / انتظار / بيع
      6. هدف سعري للـ 3 شهور
      7. تقييم من 5 نجوم
      
      في الآخر: تنبيه أن التحليل للأغراض التعليمية فقط
    `;

    if (!process.env.CLAUDE_API_KEY) {
      throw new AppError('SERVICE_UNAVAILABLE', 503);
    }

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1500,
        system: CLAUDE_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.text();
      logger.error('Claude API Error', { errorData });
      throw new AppError('INTERNAL_ERROR', 500);
    }

    const claudeData = (await claudeResponse.json()) as { content: Array<{ text: string }> };
    const rawText = claudeData.content[0]?.text;
    if (!rawText) {
      throw new AppError('INTERNAL_ERROR', 500);
    }

    let analysisJson: unknown;
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      analysisJson = JSON.parse(cleaned);
    } catch (parseError) {
      logger.error('Failed to parse Claude JSON response', { parseError });
      throw new AppError('INTERNAL_ERROR', 500);
    }

    const savedAnalysis = await prisma.analysis.create({
      data: {
        userId,
        ticker,
        content: JSON.stringify(analysisJson),
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { aiAnalysisUsedThisMonth: usedThisMonth + 1 },
    });

    const newAchievements = await addNewlyUnlockedAchievements(userId, completedBefore);

    return {
      analysis: analysisJson,
      id: savedAnalysis.id,
      newUnseenAchievements: newAchievements,
    };
  },
};
