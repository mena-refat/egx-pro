import { describe, it, expect } from 'vitest';
import { addHoldingBodySchema, updateHoldingBodySchema } from '../../server/schemas/portfolio.schema';

describe('portfolio.schema', () => {
  describe('addHoldingBodySchema', () => {
    it('accepts valid add holding input', () => {
      const result = addHoldingBodySchema.safeParse({
        ticker: 'COMI',
        shares: 100,
        purchasePrice: 10.5,
        purchaseDate: '2024-01-15',
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.ticker).toBe('COMI');
    });

    it('rejects invalid date format', () => {
      const result = addHoldingBodySchema.safeParse({
        ticker: 'COMI',
        shares: 100,
        purchasePrice: 10,
        purchaseDate: '15-01-2024',
      });
      expect(result.success).toBe(false);
    });

    it('rejects zero shares', () => {
      const result = addHoldingBodySchema.safeParse({
        ticker: 'COMI',
        shares: 0,
        purchasePrice: 10,
        purchaseDate: '2024-01-15',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateHoldingBodySchema', () => {
    it('accepts partial update', () => {
      const result = updateHoldingBodySchema.safeParse({ shares: 50 });
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = updateHoldingBodySchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});
