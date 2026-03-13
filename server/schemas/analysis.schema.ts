/**
 * Analysis API request schemas.
 */
import { z } from 'zod';

export const compareStocksBodySchema = z.object({
  ticker1: z.string().min(2).max(20).transform((s) => s.trim().toUpperCase()),
  ticker2: z.string().min(2).max(20).transform((s) => s.trim().toUpperCase()),
});

export const recommendationsBodySchema = z.object({
  riskTolerance: z.string().optional(),
  horizon: z.string().optional(),
  sectors: z.array(z.string()).optional(),
});
