/**
 * Billing API request schemas.
 */
import { z } from 'zod';

export const validateDiscountBodySchema = z.object({
  code: z.string().max(50).optional(),
  plan: z.enum(['pro', 'annual']).optional(),
});

export const upgradeBodySchema = z.object({
  plan: z.enum(['pro', 'annual']),
  discountCode: z.string().max(50).optional(),
  paymentToken: z.string().max(500).optional(),
});
