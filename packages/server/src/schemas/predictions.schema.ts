/**
 * Predictions API request schemas.
 */
import { z } from 'zod';

const predictionDir = z.enum(['UP', 'DOWN']);
const predictionTime = z.enum(['WEEK', 'MONTH', 'THREE_MONTHS', 'SIX_MONTHS', 'NINE_MONTHS', 'YEAR']);

export const createPredictionBodySchema = z.object({
  ticker: z.string().min(2).max(20).transform((s) => s.toUpperCase()),
  mode: z.enum(['TIER', 'EXACT']).optional().default('TIER'),
  // TIER mode fields
  direction: predictionDir.optional(),
  moveTier: z.enum(['LIGHT', 'MEDIUM', 'STRONG', 'EXTREME']).optional(),
  timeframe: predictionTime.optional(),
  // EXACT mode fields
  targetPrice: z.number().positive().optional(),
  expiresAt: z.string().optional(),
  // Common
  reason: z.string().min(1, 'يرجى كتابة سبب توقعك').max(500),
  isPublic: z.boolean().optional().default(true),
});

export const predictionsFeedQuerySchema = z.object({
  filter: z.enum(['all', 'following', 'top']).optional().default('all'),
  ticker: z.string().max(20).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const predictionsMyQuerySchema = z.object({
  status: z.string().max(20).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const leaderboardQuerySchema = z.object({
  period: z.enum(['alltime', 'month', 'week']).optional().default('alltime'),
});
