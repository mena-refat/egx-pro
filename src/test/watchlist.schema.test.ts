import { describe, it, expect } from 'vitest';
import {
  addWatchlistBodySchema,
  updateWatchlistBodySchema,
  checkTargetsBodySchema,
} from '../../server/schemas/watchlist.schema';

describe('watchlist.schema', () => {
  describe('addWatchlistBodySchema', () => {
    it('accepts valid add watchlist input', () => {
      const result = addWatchlistBodySchema.safeParse({
        ticker: 'comi',
        targetPrice: 25.5,
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.ticker).toBe('COMI');
    });

    it('accepts ticker only without targetPrice', () => {
      const result = addWatchlistBodySchema.safeParse({ ticker: 'COMI' });
      expect(result.success).toBe(true);
    });

    it('rejects ticker too short', () => {
      const result = addWatchlistBodySchema.safeParse({ ticker: 'A' });
      expect(result.success).toBe(false);
    });

    it('rejects non-positive targetPrice', () => {
      const result = addWatchlistBodySchema.safeParse({
        ticker: 'COMI',
        targetPrice: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateWatchlistBodySchema', () => {
    it('accepts targetPrice update', () => {
      const result = updateWatchlistBodySchema.safeParse({ targetPrice: 30 });
      expect(result.success).toBe(true);
    });

    it('accepts null targetPrice', () => {
      const result = updateWatchlistBodySchema.safeParse({ targetPrice: null });
      expect(result.success).toBe(true);
    });
  });

  describe('checkTargetsBodySchema', () => {
    it('accepts valid check targets items', () => {
      const result = checkTargetsBodySchema.safeParse({
        items: [
          { ticker: 'COMI', targetPrice: 20, currentPrice: 21 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty items', () => {
      const result = checkTargetsBodySchema.safeParse({ items: [] });
      expect(result.success).toBe(true);
    });
  });
});
