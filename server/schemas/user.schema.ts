/**
 * User / profile API request schemas.
 */
import { z } from 'zod';

export const updateProfileBodySchema = z.object({
  fullName: z.string().min(3).max(50).regex(/^[a-zA-Z\s\u0600-\u06FF]+$/).optional(),
  username: z.string().min(6).max(18).regex(/^[a-zA-Z0-9_-]+$/).transform((s) => s.trim().toLowerCase()).optional(),
  locale: z.string().length(2).optional(),
});
