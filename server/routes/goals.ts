import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.ts';
import { verifyAccessToken } from '../../src/lib/auth.ts';
import { goalSchema, goalUpdateSchema, goalAmountSchema } from '../../src/lib/validations.ts';
import { ZodError } from 'zod';
import { AuthRequest } from './types';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { isPro, FREE_LIMITS } from '../lib/plan.ts';

const router = Router();

const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token) as { sub: string };
    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /api/goals — all user goals (active first, then completed)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(goals);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/goals — create goal
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { plan: true, subscriptionPlan: true, referralProExpiresAt: true },
    });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!isPro(user)) {
      const count = await prisma.goal.count({ where: { userId: req.userId! } });
      if (count >= FREE_LIMITS.goals) {
        return res.status(403).json({
          error: 'pro_required',
          code: 'GOALS_LIMIT',
          message: 'هذه الميزة متاحة في Pro',
          limit: FREE_LIMITS.goals,
        });
      }
    }

    const raw = req.body && typeof req.body === 'object' ? req.body : {};
    const body = {
      title: raw.title ?? '',
      category: raw.category ?? 'home',
      targetAmount: raw.targetAmount,
      currentAmount: raw.currentAmount ?? 0,
      currency: raw.currency ?? 'EGP',
      deadline: raw.deadline === undefined || raw.deadline === '' ? null : raw.deadline,
    };
    const validatedData = goalSchema.parse(body);
    const title = validatedData.title;
    const category = validatedData.category;
    const targetAmount = validatedData.targetAmount;
    const currentAmount = Number(validatedData.currentAmount) || 0;
    const deadline = validatedData.deadline
      ? new Date(validatedData.deadline as string)
      : null;

    const completedBefore = await getCompletedAchievementIds(req.userId!);
    const goal = await prisma.goal.create({
      data: {
        userId: req.userId!,
        title,
        category,
        targetAmount,
        currentAmount,
        currency: (validatedData as { currency?: string }).currency ?? 'EGP',
        deadline,
      },
    });
    const newAchievements = await addNewlyUnlockedAchievements(req.userId!, completedBefore);
    res.status(201).json({ ...goal, newUnseenAchievements: newAchievements });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message ?? 'Validation failed' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/goals/:id — update goal
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const goal = await prisma.goal.findFirst({ where: { id, userId: req.userId! } });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const validatedData = goalUpdateSchema.parse(req.body);
    const updateData: Record<string, unknown> = {};
    if (validatedData.title != null) updateData.title = validatedData.title;
    if (validatedData.category != null) updateData.category = validatedData.category;
    if (validatedData.targetAmount != null) updateData.targetAmount = validatedData.targetAmount;
    if (validatedData.currentAmount != null) updateData.currentAmount = validatedData.currentAmount;
    if (validatedData.deadline !== undefined) updateData.deadline = validatedData.deadline ? new Date(validatedData.deadline as string) : null;

    const updated = await prisma.goal.update({
      where: { id },
      data: updateData,
    });
    res.json(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message ?? 'Validation failed' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/goals/:id/amount — update current amount only (auto-complete if >= target)
router.patch('/:id/amount', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const goal = await prisma.goal.findFirst({ where: { id, userId: req.userId! } });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const { currentAmount } = goalAmountSchema.parse(req.body);
    const now = new Date();
    const isComplete = currentAmount >= goal.targetAmount;
    const completedBefore = isComplete ? await getCompletedAchievementIds(req.userId!) : null;

    const updated = await prisma.goal.update({
      where: { id },
      data: isComplete
        ? { currentAmount: goal.targetAmount, status: 'completed', achievedAt: now }
        : { currentAmount },
    });

    if (isComplete && completedBefore !== null) {
      await addNewlyUnlockedAchievements(req.userId!, completedBefore);
    }
    res.json(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message ?? 'Validation failed' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/goals/:id/complete — mark as complete
router.patch('/:id/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const goal = await prisma.goal.findFirst({ where: { id, userId: req.userId! } });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const now = new Date();
    const completedBefore = await getCompletedAchievementIds(req.userId!);
    const updated = await prisma.goal.update({
      where: { id },
      data: {
        status: 'completed',
        achievedAt: now,
        currentAmount: goal.targetAmount,
      },
    });
    const newAchievements = await addNewlyUnlockedAchievements(req.userId!, completedBefore);
    res.json({ ...updated, newUnseenAchievements: newAchievements });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/goals/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const goal = await prisma.goal.findFirst({ where: { id, userId: req.userId! } });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    await prisma.goal.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
