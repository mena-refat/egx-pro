import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.ts';

const router = Router();

type Plan = 'free' | 'pro' | 'annual';

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

router.get('/plan', async (req: Request, res: Response) => {
  try {
    const userId = ('user' in req && (req as { user?: { id?: string } }).user?.id);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        subscriptionEndsAt: true,
        analysisUsageMonth: true,
        analysisUsageCount: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const monthKey = getCurrentMonthKey();
    const usedThisMonth =
      user.analysisUsageMonth === monthKey ? user.analysisUsageCount : 0;

    const quota =
      (user.subscriptionPlan as Plan) === 'free'
        ? 3
        : Infinity;

    res.json({
      plan: user.subscriptionPlan as Plan,
      subscriptionEndsAt: user.subscriptionEndsAt,
      analysis: {
        month: monthKey,
        used: usedThisMonth,
        quota,
      },
    });
  } catch (error) {
    console.error('Billing /plan error:', error);
    res.status(500).json({ error: 'Failed to load plan' });
  }
});

// Simple upgrade endpoint (no real payment integration, just switches plan)
router.post('/upgrade', async (req: Request, res: Response) => {
  try {
    const userId = ('user' in req && (req as { user?: { id?: string } }).user?.id);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { plan } = req.body as { plan: Plan };
    if (!['pro', 'annual'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const now = new Date();
    const endsAt = new Date(now);
    if (plan === 'pro') {
      endsAt.setMonth(endsAt.getMonth() + 1);
    } else {
      endsAt.setFullYear(endsAt.getFullYear() + 1);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: plan,
        subscriptionEndsAt: endsAt,
      },
      select: {
        subscriptionPlan: true,
        subscriptionEndsAt: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Billing /upgrade error:', error);
    res.status(500).json({ error: 'Failed to upgrade plan' });
  }
});

export default router;

