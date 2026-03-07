import { describe, it, expect } from 'vitest';
import { isPro } from '../../server/lib/plan';

describe('isPro', () => {
  it('returns false for free plan', () => {
    expect(isPro({ plan: 'free' })).toBe(false);
  });
  it('returns true for pro plan', () => {
    expect(isPro({ plan: 'pro' })).toBe(true);
  });
  it('returns true for active referral pro', () => {
    const future = new Date(Date.now() + 86400000);
    expect(isPro({ plan: 'free', referralProExpiresAt: future })).toBe(true);
  });
  it('returns false for expired referral pro', () => {
    const past = new Date(Date.now() - 86400000);
    expect(isPro({ plan: 'free', referralProExpiresAt: past })).toBe(false);
  });
});
