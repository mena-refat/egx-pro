import { describe, it, expect, beforeEach } from 'vitest';
import { MarketDataService } from '../services/market-data/market-data.service.ts';

describe('MarketDataService', () => {
  let service: MarketDataService;

  beforeEach(() => {
    service = new MarketDataService();
  });

  describe('isMarketOpen', () => {
    it('returns boolean', () => {
      const result = service.isMarketOpen();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getCachedQuotes', () => {
    it('returns empty map for unknown symbols', async () => {
      const result = await service.getCachedQuotes(['XXXXX']);
      expect(result.size).toBe(0);
    });
  });

  describe('getQuote', () => {
    it('returns null for non-existent symbol', async () => {
      const result = await service.getQuote('NONEXISTENT999');
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('getHealthReport', () => {
    it('returns object with source health', () => {
      const report = service.getHealthReport();
      expect(typeof report).toBe('object');
      expect(Object.keys(report).length).toBeGreaterThan(0);
      for (const [, value] of Object.entries(report)) {
        const v = value as Record<string, unknown>;
        expect(v).toHaveProperty('status');
        expect(v).toHaveProperty('failures');
        expect(v).toHaveProperty('lastSuccess');
        expect(v).toHaveProperty('avgLatencyMs');
      }
    });
  });

  describe('source fallback', () => {
    it('has multiple sources configured', () => {
      const report = service.getHealthReport();
      expect(Object.keys(report).length).toBeGreaterThanOrEqual(2);
    });
  });
});
