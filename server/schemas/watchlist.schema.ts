/**
 * Watchlist API request schemas.
 */
import { z } from 'zod';

export const addWatchlistBodySchema = z.object({
  ticker: z.string().min(2).max(20).transform((s) => s.toUpperCase()),
  targetPrice: z.number().positive().optional(),
});

export const updateWatchlistBodySchema = z.object({
  targetPrice: z.number().positive().nullable().optional(),
});

export const checkTargetsBodySchema = z.object({
  items: z.array(
    z.object({
      ticker: z.string().min(1).max(20),
      targetPrice: z.number().positive(),
      currentPrice: z.number().nonnegative(),
    })
  ).max(200),
});
