/**
 * Portfolio API request schemas.
 */
import { z } from 'zod';

const todayISO = () => new Date().toISOString().slice(0, 10);

export const addHoldingBodySchema = z.object({
  ticker: z.string().min(2).max(20).transform((s) => s.toUpperCase()),
  shares: z.coerce.number().int().min(1).max(1_000_000),
  purchasePrice: z.coerce.number().positive(),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date YYYY-MM-DD')
    .refine((dateStr) => dateStr <= todayISO(), { message: 'Purchase date cannot be in the future' }),
  type: z.enum(['BUY', 'SELL']).default('BUY'),
});

export const updateHoldingBodySchema = z.object({
  shares: z.coerce.number().int().min(0).max(1_000_000).optional(),
  purchasePrice: z.coerce.number().positive().optional(),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((dateStr) => dateStr <= todayISO(), { message: 'Purchase date cannot be in the future' })
    .optional(),
});
