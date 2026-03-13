/**
 * Billing API request schemas.
 */
import { z } from 'zod';

export const validateDiscountBodySchema = z.object({
  code: z.string().max(50).optional(),
  plan: z.enum(['pro', 'annual', 'ultra', 'ultra_annual']).optional(),
});

export const upgradeBodySchema = z.object({
  plan: z.enum(['pro_monthly', 'pro_yearly', 'ultra_monthly', 'ultra_yearly', 'pro', 'annual']),
  discountCode: z.string().max(50).optional(),
  paymentToken: z.string().max(500).optional(),
});
