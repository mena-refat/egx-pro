import { describe, it, expect } from 'vitest';
import {
  createPredictionBodySchema,
  predictionsFeedQuerySchema,
  predictionsMyQuerySchema,
  leaderboardQuerySchema,
} from '../../server/schemas/predictions.schema';

describe('predictions.schema', () => {
  describe('createPredictionBodySchema', () => {
    it('accepts valid create prediction input', () => {
      const result = createPredictionBodySchema.safeParse({
        ticker: 'COMI',
        direction: 'UP',
        timeframe: 'WEEK',
        targetPrice: 15.5,
        reason: 'تحسن أرباح الشركة وأرباح قوية.',
        isPublic: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ticker).toBe('COMI');
        expect(result.data.reason).toBeDefined();
        expect(result.data.isPublic).toBe(true);
      }
    });

    it('rejects missing reason', () => {
      const result = createPredictionBodySchema.safeParse({
        ticker: 'COMI',
        direction: 'UP',
        timeframe: 'MONTH',
        targetPrice: 20,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid direction', () => {
      const result = createPredictionBodySchema.safeParse({
        ticker: 'COMI',
        direction: 'SIDE',
        timeframe: 'WEEK',
        targetPrice: 10,
        reason: 'سبب',
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-positive targetPrice', () => {
      const result = createPredictionBodySchema.safeParse({
        ticker: 'COMI',
        direction: 'UP',
        timeframe: 'WEEK',
        targetPrice: 0,
        reason: 'سبب',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('predictionsFeedQuerySchema', () => {
    it('accepts valid feed query', () => {
      const result = predictionsFeedQuerySchema.safeParse({ filter: 'following', page: 1, limit: 10 });
      expect(result.success).toBe(true);
    });

    it('defaults filter to all', () => {
      const result = predictionsFeedQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.filter).toBe('all');
    });
  });

  describe('predictionsMyQuerySchema', () => {
    it('accepts valid my query', () => {
      const result = predictionsMyQuerySchema.safeParse({ status: 'ACTIVE', page: 2 });
      expect(result.success).toBe(true);
    });
  });

  describe('leaderboardQuerySchema', () => {
    it('accepts period enum', () => {
      const result = leaderboardQuerySchema.safeParse({ period: 'month' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.period).toBe('month');
    });
  });
});
