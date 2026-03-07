import { describe, it, expect } from 'vitest';
import { normalizePhone, isValidEgyptianPhone } from '../lib/validations';

describe('Egyptian phone validation', () => {
  it('normalizes 01x numbers correctly', () => {
    expect(normalizePhone('01012345678')).toBe('01012345678');
    expect(normalizePhone('201012345678')).toBe('01012345678');
  });
  it('validates correct Egyptian numbers', () => {
    expect(isValidEgyptianPhone('01012345678')).toBe(true);
    expect(isValidEgyptianPhone('+201234567890')).toBe(false);
  });
});
