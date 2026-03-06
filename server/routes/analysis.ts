import { Router, Request, Response } from 'express';
import { getStockPrice, getStockHistory, getFinancials } from '../lib/yahoo.ts';
import { getStockNews } from '../lib/news.ts';
import { prisma } from '../lib/prisma.ts';
import { rateLimit } from 'express-rate-limit';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { isPro, FREE_LIMITS } from '../lib/plan.ts';

const router = Router();

type Plan = 'free' | 'pro' | 'annual';

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getFirstDayOfNextMonth(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Rate limit: 20 analysis per hour per user (network-level)
const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many analysis requests, please try again later.' },
  keyGenerator: (req) => {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (userId) return userId;
    return req.ip || 'unknown';
  },
  validate: { 
    xForwardedForHeader: false,
    trustProxy: false,
    ip: false 
  }
});

router.post('/:ticker', analysisLimiter, async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const userId = ('user' in req && (req as { user?: { id?: string } }).user?.id); // Ensure auth middleware sets this

    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    // 0. Enforce subscription-based quota
    const now = new Date();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        subscriptionEndsAt: true,
        referralProExpiresAt: true,
        plan: true,
        aiAnalysisUsedThisMonth: true,
        aiAnalysisResetDate: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'not_found' });
    }

    const effectivePro = isPro(user);
    const quota = effectivePro ? Infinity : FREE_LIMITS.aiAnalysisPerMonth;

    // Reset AI counter if we entered a new month
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
      return res.status(402).json({
        error: 'Free plan limit reached',
        code: 'ANALYSIS_LIMIT_REACHED',
        message: 'هذه الميزة متاحة في Pro',
        details: {
          plan: 'free',
          used: usedThisMonth,
          quota,
        },
      });
    }

    // 1. Gather all required data
    const [priceData, , financials, news] = await Promise.all([
      getStockPrice(ticker),
      getStockHistory(ticker, '3mo'),
      getFinancials(ticker),
      getStockNews(ticker)
    ]) as [
      { price: number; changePercent: number; volume: number | null },
      unknown,
      {
        pe: number | null;
        roe: number | null;
        profitMargin: number | null;
        revenue: number | null;
      } | null,
      Array<{ title: string }>
    ];

    if (!priceData || !financials) {
      return res.status(404).json({ error: 'not_found' });
    }

    // 2. Prepare prompt for Claude
    const prompt = `
      حلل السهم التالي وقدم تقرير شامل:
      
      ═══ بيانات السهم ═══
      الاسم: ${ticker}
      السعر: ${priceData.price} جنيه
      التغير: ${priceData.changePercent}%
      الحجم: ${priceData.volume}
      
      ═══ التحليل المالي ═══
      P/E: ${financials.pe || 'غير متوفر'}
      ROE: ${financials.roe ? (financials.roe * 100).toFixed(2) : 'غير متوفر'}%
      هامش الربح: ${financials.profitMargin ? (financials.profitMargin * 100).toFixed(2) : 'غير متوفر'}%
      الإيرادات: ${financials.revenue || 'غير متوفر'}
      
      ═══ آخر الأخبار ═══
      ${news.length > 0 ? news.map((n: { title: string }) => '- ' + n.title).join('\n') : 'لا توجد أخبار حديثة'}
      
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

    // 3. Call Claude API
    if (!process.env.CLAUDE_API_KEY) {
      return res.status(503).json({ error: 'AI analysis service is not configured' });
    }
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1500,
        system: `أنت محلل مالي خبير متخصص في البورصة المصرية.
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
}`,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.text();
      console.error('Claude API Error:', errorData);
      throw new Error('Failed to generate analysis from AI');
    }

    const claudeData = await claudeResponse.json();
    const rawText = claudeData.content[0].text;

    let analysisJson;
    try {
      // نظّف النص من أي backticks لو موجودة
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      analysisJson = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Failed to parse Claude JSON response:', parseError);
      throw new Error('AI returned invalid format', { cause: parseError });
    }

    // 4. Save to Database
    const savedAnalysis = await prisma.analysis.create({
      data: {
        userId,
        ticker,
        content: JSON.stringify(analysisJson)
      }
    });

    // 4. Update usage counters
    const updatedUsed = usedThisMonth + 1;
    await prisma.user.update({
      where: { id: userId },
      data: {
        aiAnalysisUsedThisMonth: updatedUsed,
        analysisUsageMonth: getCurrentMonthKey(),
        analysisUsageCount: updatedUsed,
      },
    });

    const newAchievements = await addNewlyUnlockedAchievements(userId, completedBefore);

    // 5. Return result
    res.json({ analysis: analysisJson, id: savedAnalysis.id, newUnseenAchievements: newAchievements });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to generate analysis' });
  }
});

export default router;
