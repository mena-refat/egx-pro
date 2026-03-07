import { describe, it, expect } from 'vitest';
import { isPro } from '../lib/plan.ts';

describe('isPro (server)', () => {
  it('يرجع true لـ pro plan غير منتهي', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    expect(isPro({ plan: 'pro', planExpiresAt: future, referralProExpiresAt: null })).toBe(true);
  });

  it('يرجع false لـ pro plan منتهي', () => {
    const past = new Date(Date.now() - 1000);
    expect(isPro({ plan: 'pro', planExpiresAt: past, referralProExpiresAt: null })).toBe(false);
  });

  it('يرجع false لـ free plan', () => {
    expect(isPro({ plan: 'free', planExpiresAt: null, referralProExpiresAt: null })).toBe(false);
  });

  it('يرجع true لـ yearly plan نشط', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);
    expect(isPro({ plan: 'yearly', planExpiresAt: future, referralProExpiresAt: null })).toBe(true);
  });

  it('يرجع true لو referralProExpiresAt لسه ما انتهاش', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
    expect(isPro({ plan: 'free', planExpiresAt: null, referralProExpiresAt: future })).toBe(true);
  });
});
