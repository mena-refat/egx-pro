/**
 * User / profile API request schemas.
 */
import { z } from 'zod';

export const updateProfileBodySchema = z
  .object({
    fullName: z.string().min(3).max(50).regex(/^[a-zA-Z\s\u0600-\u06FF]+$/).optional(),
    email: z.string().email().max(255).optional().nullable(),
    phone: z.string().max(15).optional().nullable(),
    username: z
      .string()
      .min(6)
      .max(18)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .transform((s) => s.trim().toLowerCase())
      .optional(),
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
    investmentHorizon: z.coerce.number().int().min(1).max(30).optional(),
    monthlyBudget: z.coerce.number().min(0).optional(),
    shariaMode: z.boolean().optional(),
    onboardingCompleted: z.boolean().optional(),
    isFirstLogin: z.boolean().optional(),
    interestedSectors: z.array(z.string()).optional(),
    language: z.enum(['ar', 'en', 'system']).optional(),
    theme: z.enum(['dark', 'light', 'system']).optional(),
    notifySignals: z.boolean().optional(),
    notifyPortfolio: z.boolean().optional(),
    notifyNews: z.boolean().optional(),
    notifyAchievements: z.boolean().optional(),
    notifyGoals: z.boolean().optional(),
    hearAboutUs: z.string().max(200).optional(),
    investorProfile: z.record(z.unknown()).optional(),
  })
  .strict();

export const deleteAccountBodySchema = z.object({
  confirmText: z.string().min(1),
  password: z.string().min(1),
});

export const uploadAvatarBodySchema = z.object({
  image: z.string().min(1, 'Image data is required'),
});
