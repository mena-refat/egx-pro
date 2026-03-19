import { describe, it, expect } from 'vitest';
import {
  createGoalBodySchema,
  updateGoalBodySchema,
  updateGoalAmountBodySchema,
} from '../../server/schemas/goals.schema';

describe('goals.schema', () => {
  describe('createGoalBodySchema', () => {
    it('accepts valid create goal input', () => {
      const result = createGoalBodySchema.safeParse({
        title: 'شراء سيارة',
        category: 'car',
        targetAmount: 500_000,
        currentAmount: 50_000,
        currency: 'EGP',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('شراء سيارة');
        expect(result.data.category).toBe('car');
        expect(result.data.currency).toBe('EGP');
      }
    });

    it('rejects title shorter than 3 chars', () => {
      const result = createGoalBodySchema.safeParse({
        title: 'ab',
        category: 'home',
        targetAmount: 1000,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative targetAmount', () => {
      const result = createGoalBodySchema.safeParse({
        title: 'هدف',
        category: 'other',
        targetAmount: -100,
      });
      expect(result.success).toBe(false);
    });

    it('accepts valid deadline', () => {
      const result = createGoalBodySchema.safeParse({
        title: 'هدف مع موعد',
        targetAmount: 10_000,
        deadline: '2025-12-31',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('updateGoalBodySchema', () => {
    it('accepts partial update', () => {
      const result = updateGoalBodySchema.safeParse({ title: 'عنوان محدث' });
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = updateGoalBodySchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('updateGoalAmountBodySchema', () => {
    it('accepts valid amount', () => {
      const result = updateGoalAmountBodySchema.safeParse({ currentAmount: 5000 });
      expect(result.success).toBe(true);
    });

    it('rejects negative currentAmount', () => {
      const result = updateGoalAmountBodySchema.safeParse({ currentAmount: -1 });
      expect(result.success).toBe(false);
    });
  });
});
