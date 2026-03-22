import { UserRepository } from '../repositories/user.repository.ts';
import { goalSchema, goalUpdateSchema, goalAmountSchema } from '../lib/validations.ts';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { getLimit } from '../lib/plan.ts';
import { AppError } from '../lib/errors.ts';
import { GoalsRepository } from '../repositories/goals.repository.ts';
import type { AuthUser } from '../routes/types.ts';
import type { z } from 'zod';

type GoalSchema = z.infer<typeof goalSchema>;
type GoalUpdateSchema = z.infer<typeof goalUpdateSchema>;

export const GoalsService = {
  async getUserGoals(userId: number, page = 1, limit = 50) {
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(50, Math.max(1, limit));
    const [items, total] = await GoalsRepository.findByUser(userId, pageNum, limitNum);
    return {
      items,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  },

  async create(user: AuthUser, body: unknown): Promise<{ goal: Awaited<ReturnType<typeof GoalsRepository.create>>; newUnseenAchievements: string[] }> {
    if (!user?.id) throw new AppError('UNAUTHORIZED', 401);
    const planUser = await UserRepository.getPlanUser(user.id);
    if (!planUser) throw new AppError('UNAUTHORIZED', 401);
    const goalsLimit = getLimit(planUser, 'goals');
    const count = await GoalsRepository.countActiveByUser(user.id);
    if (count >= (typeof goalsLimit === 'number' ? goalsLimit : 0))
      throw new AppError('GOAL_LIMIT_REACHED', 403);

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
    const goal = await GoalsRepository.create({
      userId: user.id,
      title: parsed.title,
      category: parsed.category,
      targetAmount: parsed.targetAmount,
      currentAmount: Number(parsed.currentAmount) || 0,
      currency,
      deadline,
    });
    const newUnseenAchievements = await addNewlyUnlockedAchievements(user.id, completedBefore);
    return { goal, newUnseenAchievements };
  },

  async update(userId: number, goalId: string, body: unknown) {
    const goal = await GoalsRepository.findOwned(goalId, userId);
    if (!goal) throw new AppError('NOT_FOUND', 404);
    const validated = goalUpdateSchema.parse(body) as GoalUpdateSchema;
    const updateData: Record<string, unknown> = {};
    if (validated.title != null) updateData.title = validated.title;
    if (validated.category != null) updateData.category = validated.category;
    if (validated.targetAmount != null) updateData.targetAmount = validated.targetAmount;
    if (validated.currentAmount != null) updateData.currentAmount = validated.currentAmount;
    if (validated.deadline !== undefined) updateData.deadline = validated.deadline ? new Date(validated.deadline as string) : null;
    return GoalsRepository.update(goalId, updateData);
  },

  async updateAmount(userId: number, goalId: string, body: unknown) {
    const goal = await GoalsRepository.findOwned(goalId, userId);
    if (!goal) throw new AppError('NOT_FOUND', 404);
    const { currentAmount } = goalAmountSchema.parse(body);
    const now = new Date();
    const isComplete = currentAmount >= goal.targetAmount;
    const completedBefore = isComplete ? await getCompletedAchievementIds(userId) : null;
    const updated = await GoalsRepository.update(
      goalId,
      isComplete
        ? { currentAmount: goal.targetAmount, status: 'completed', achievedAt: now }
        : { currentAmount }
    );
    if (isComplete && completedBefore !== null) {
      await addNewlyUnlockedAchievements(userId, completedBefore);
    }
    return updated;
  },

  async complete(userId: number, goalId: string): Promise<{ goal: Awaited<ReturnType<typeof GoalsRepository.update>>; newUnseenAchievements: string[] }> {
    const goal = await GoalsRepository.findOwned(goalId, userId);
    if (!goal) throw new AppError('NOT_FOUND', 404);
    const now = new Date();
    const completedBefore = await getCompletedAchievementIds(userId);
    const updated = await GoalsRepository.update(goalId, {
      status: 'completed',
      achievedAt: now,
      currentAmount: goal.targetAmount,
    });
    const newUnseenAchievements = await addNewlyUnlockedAchievements(userId, completedBefore);
    return { goal: updated, newUnseenAchievements };
  },

  async delete(userId: number, goalId: string): Promise<void> {
    const goal = await GoalsRepository.findOwned(goalId, userId);
    if (!goal) throw new AppError('NOT_FOUND', 404);
    await GoalsRepository.delete(goalId);
  },
};