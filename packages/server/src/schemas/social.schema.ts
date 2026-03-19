/**
 * Social API request schemas.
 */
import { z } from 'zod';

export const updateSocialSettingsBodySchema = z.object({
  isPrivate: z.boolean().optional(),
  showPortfolio: z.boolean().optional(),
});

export const usernameSearchQuerySchema = z.object({
  q: z.string().max(100).default(''),
  limit: z.coerce.number().int().min(1).max(5).default(5),
});
