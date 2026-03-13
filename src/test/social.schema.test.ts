import { describe, it, expect } from 'vitest';
import {
  updateSocialSettingsBodySchema,
  usernameSearchQuerySchema,
} from '../../server/schemas/social.schema';

describe('social.schema', () => {
  describe('updateSocialSettingsBodySchema', () => {
    it('accepts isPrivate and showPortfolio', () => {
      const result = updateSocialSettingsBodySchema.safeParse({
        isPrivate: true,
        showPortfolio: false,
      });
      expect(result.success).toBe(true);
    });

    it('accepts partial update', () => {
      const result = updateSocialSettingsBodySchema.safeParse({ isPrivate: true });
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = updateSocialSettingsBodySchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('usernameSearchQuerySchema', () => {
    it('accepts q and limit', () => {
      const result = usernameSearchQuerySchema.safeParse({ q: 'ahmed', limit: 5 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.q).toBe('ahmed');
        expect(result.data.limit).toBe(5);
      }
    });

    it('rejects limit above 5', () => {
      const result = usernameSearchQuerySchema.safeParse({ q: 'test', limit: 10 });
      expect(result.success).toBe(false);
    });
  });
});
