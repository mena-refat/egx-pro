import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../lib/auth';

describe('password hashing', () => {
  it('should hash and verify correctly', async () => {
    const { hash, salt } = await hashPassword('TestPass123!');
    expect(await verifyPassword('TestPass123!', hash, salt)).toBe(true);
    expect(await verifyPassword('WrongPass', hash, salt)).toBe(false);
  });

  it('should produce different hashes for same password', async () => {
    const a = await hashPassword('TestPass123!');
    const b = await hashPassword('TestPass123!');
    expect(a.hash).not.toBe(b.hash);
  });
});
