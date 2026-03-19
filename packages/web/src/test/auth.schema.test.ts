import { describe, it, expect } from 'vitest';
import {
  registerBodySchema,
  loginBodySchema,
  verifyEmailConfirmBodySchema,
  changePasswordBodySchema,
} from '../../server/schemas/auth.schema';

describe('auth.schema', () => {
  describe('registerBodySchema', () => {
    it('accepts valid register input', () => {
      const result = registerBodySchema.safeParse({
        fullName: 'أحمد محمد',
        emailOrPhone: 'test@example.com',
        password: 'SecurePass123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short fullName', () => {
      const result = registerBodySchema.safeParse({
        fullName: 'Ab',
        emailOrPhone: 'test@example.com',
        password: 'SecurePass123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = registerBodySchema.safeParse({
        fullName: 'Ahmed',
        emailOrPhone: 'not-an-email',
        password: 'SecurePass123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginBodySchema', () => {
    it('accepts valid login input', () => {
      const result = loginBodySchema.safeParse({
        emailOrPhone: 'user@example.com',
        password: 'password',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
      const result = loginBodySchema.safeParse({
        emailOrPhone: 'user@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('verifyEmailConfirmBodySchema', () => {
    it('accepts 6-digit code', () => {
      const result = verifyEmailConfirmBodySchema.safeParse({ code: '123456' });
      expect(result.success).toBe(true);
    });

    it('rejects non-6-digit code', () => {
      expect(verifyEmailConfirmBodySchema.safeParse({ code: '12345' }).success).toBe(false);
      expect(verifyEmailConfirmBodySchema.safeParse({ code: '1234567' }).success).toBe(false);
      expect(verifyEmailConfirmBodySchema.safeParse({ code: 'abcdef' }).success).toBe(false);
    });
  });

  describe('changePasswordBodySchema', () => {
    it('accepts valid change password input', () => {
      const result = changePasswordBodySchema.safeParse({
        currentPassword: 'old',
        newPassword: 'newPassword123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short new password', () => {
      const result = changePasswordBodySchema.safeParse({
        currentPassword: 'old',
        newPassword: 'short',
      });
      expect(result.success).toBe(false);
    });
  });
});
