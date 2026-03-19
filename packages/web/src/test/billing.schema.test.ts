import { describe, it, expect } from 'vitest';
import { validateDiscountBodySchema, upgradeBodySchema } from '../../server/schemas/billing.schema';

describe('billing.schema', () => {
  describe('validateDiscountBodySchema', () => {
    it('accepts code and plan', () => {
      const result = validateDiscountBodySchema.safeParse({
        code: 'SAVE20',
        plan: 'pro',
      });
      expect(result.success).toBe(true);
    });

    it('accepts ultra plan', () => {
      const result = validateDiscountBodySchema.safeParse({ plan: 'ultra_annual' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid plan', () => {
      const result = validateDiscountBodySchema.safeParse({ plan: 'invalid_plan' });
      expect(result.success).toBe(false);
    });
  });

  describe('upgradeBodySchema', () => {
    it('accepts valid upgrade plan', () => {
      const result = upgradeBodySchema.safeParse({
        plan: 'pro_monthly',
        discountCode: 'PROMO',
      });
      expect(result.success).toBe(true);
    });

    it('accepts ultra plans', () => {
      const result = upgradeBodySchema.safeParse({ plan: 'ultra_yearly' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid plan', () => {
      const result = upgradeBodySchema.safeParse({ plan: 'free' });
      expect(result.success).toBe(false);
    });
  });
});
