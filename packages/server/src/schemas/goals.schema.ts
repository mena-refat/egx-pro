/**
 * Goals API request schemas.
 */
import { z } from 'zod';

const goalCategoryEnum = z.enum(['home', 'car', 'retirement', 'wealth', 'travel', 'other']);

export const createGoalBodySchema = z.object({
  title: z.string().min(3).max(500),
  category: goalCategoryEnum.default('home'),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number().min(0).optional().default(0),
  currency: z.string().length(3).optional().default('EGP'),
  deadline: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.literal(''),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .transform((v) => (v == null || v === '' ? null : (v as string)))
    .refine(
      (v) => v == null || new Date(v) > new Date(new Date().toISOString().slice(0, 10)),
      { message: 'DEADLINE_IN_PAST' },
    ),
});

export const updateGoalBodySchema = z.object({
  title: z.string().min(3).max(500).optional(),
  category: goalCategoryEnum.optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export const updateGoalAmountBodySchema = z.object({
  currentAmount: z.number().min(0),
});
