import { describe, it, expect } from 'vitest';
import {
  updateProfileBodySchema,
  deleteAccountBodySchema,
  uploadAvatarBodySchema,
} from '../../server/schemas/user.schema';

describe('user.schema', () => {
  describe('updateProfileBodySchema', () => {
    it('accepts partial profile update', () => {
      const result = updateProfileBodySchema.safeParse({
        fullName: 'أحمد محمد',
        language: 'ar',
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = updateProfileBodySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects invalid theme', () => {
      const result = updateProfileBodySchema.safeParse({ theme: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('deleteAccountBodySchema', () => {
    it('accepts confirmText and password', () => {
      const result = deleteAccountBodySchema.safeParse({
        confirmText: 'حذف',
        password: 'SecurePass123!',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing password', () => {
      const result = deleteAccountBodySchema.safeParse({ confirmText: 'حذف' });
      expect(result.success).toBe(false);
    });
  });

  describe('uploadAvatarBodySchema', () => {
    it('accepts image base64 string', () => {
      const result = uploadAvatarBodySchema.safeParse({
        image: 'data:image/png;base64,iVBORw0KGgo=',
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-string image', () => {
      const result = uploadAvatarBodySchema.safeParse({ image: 123 });
      expect(result.success).toBe(false);
    });
  });
});
