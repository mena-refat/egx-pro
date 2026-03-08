import { prisma } from '../lib/prisma.ts';
import { goalSchema, goalUpdateSchema, goalAmountSchema } from '../../src/lib/validations.ts';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { isPro, FREE_LIMITS } from '../lib/plan.ts';
import { AppError } from '../lib/errors.ts';
import type { AuthUser } from '../routes/types.ts';
import type { z } from 'zod';

type GoalSchema = z.infer<typeof goalSchema>;
type GoalUpdateSchema = z.infer<typeof goalUpdateSchema>;

export const GoalsService = {
  async getUserGoals(userId: string, page = 1, limit = 50) {
    const where = { userId };
    const orderBy = [{ status: 'asc' as const }, { createdAt: 'desc' as const }];
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(50, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;
    const [items, total] = await Promise.all([
      prisma.goal.findMany({ where, orderBy, skip, take: limitNum }),
      prisma.goal.count({ where }),
    ]);
    return {
      items,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  },

  async create(user: AuthUser, body: unknown): Promise<{ goal: Awaited<ReturnType<typeof prisma.goal.create>>; newUnseenAchievements: string[] }> {
    if (!user?.id) throw new AppError('UNAUTHORIZED', 401);
    const planUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true, planExpiresAt: true, referralProExpiresAt: true },
    });
    if (!planUser) throw new AppError('UNAUTHORIZED', 401);
    if (!isPro(planUser)) {
      const count = await prisma.goal.count({ where: { userId: user.id } });
      if (count >= FREE_LIMITS.goals) throw new AppError('GOAL_LIMIT_REACHED', 403);
    }

    const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const parsed = goalSchema.parse({
      title: raw.title ?? '',
      category: raw.category ?? 'home',
      targetAmount: raw.targetAmount,
      currentAmount: raw.currentAmount ?? 0,
      currency: raw.currency ?? 'EGP',
      deadline: raw.deadline === undefined || raw.deadline === '' ? null : raw.deadline,
    }) as GoalSchema;
    const deadline = parsed.deadline ? new Date(parsed.deadline as string) : null;
    const currency = (parsed as { currency?: string }).currency ?? 'EGP';

    const completedBefore = await getCompletedAchievementIds(user.id);
    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: parsed.title,
        category: parsed.category,
        targetAmount: parsed.targetAmount,
        currentAmount: Number(parsed.currentAmount) || 0,
        currency,
        deadline,
      },
    });
    const newUnseenAchievements = await addNewlyUnlockedAchievements(user.id, completedBefore);
    return { goal, newUnseenAchievements };
  },

  async update(userId: string, goalId: string, body: unknown) {
    const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw new AppError('NOT_FOUND', 404);
    const validated = goalUpdateSchema.parse(body) as GoalUpdateSchema;
    const updateData: Record<string, unknown> = {};
    if (validated.title != null) updateData.title = validated.title;
    if (validated.category != null) updateData.category = validated.category;
    if (validated.targetAmount != null) updateData.targetAmount = validated.targetAmount;
    if (validated.currentAmount != null) updateData.currentAmount = validated.currentAmount;
    if (validated.deadline !== undefined) updateData.deadline = validated.deadline ? new Date(validated.deadline as string) : null;
    return prisma.goal.update({
      where: { id: goalId },
      data: updateData,
    });
  },

  async updateAmount(userId: string, goalId: string, body: unknown) {
    const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw new AppError('NOT_FOUND', 404);
    const { currentAmount } = goalAmountSchema.parse(body);
    const now = new Date();
    const isComplete = currentAmount >= goal.targetAmount;
    const completedBefore = isComplete ? await getCompletedAchievementIds(userId) : null;
    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: isComplete
        ? { currentAmount: goal.targetAmount, status: 'completed', achievedAt: now }
        : { currentAmount },
    });
    if (isComplete && completedBefore !== null) {
      await addNewlyUnlockedAchievements(userId, completedBefore);
    }
    return updated;
  },

  async complete(userId: string, goalId: string): Promise<{ goal: Awaited<ReturnType<typeof prisma.goal.update>>; newUnseenAchievements: string[] }> {
    const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw new AppError('NOT_FOUND', 404);
    const now = new Date();
    const completedBefore = await getCompletedAchievementIds(userId);
    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: { status: 'completed', achievedAt: now, currentAmount: goal.targetAmount },
    });
    const newUnseenAchievements = await addNewlyUnlockedAchievements(userId, completedBefore);
    return { goal: updated, newUnseenAchievements };
  },

  async delete(userId: string, goalId: string): Promise<void> {
    const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw new AppError('NOT_FOUND', 404);
    await prisma.goal.delete({ where: { id: goalId } });
  },
};
