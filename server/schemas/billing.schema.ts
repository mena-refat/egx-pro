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

export const googlePlayVerifySchema = z.object({
  purchaseToken: z.string().min(1).max(2000),
  productId: z.enum(['borsa_pro_monthly', 'borsa_pro_yearly', 'borsa_ultra_monthly', 'borsa_ultra_yearly']),
  plan: z.enum(['pro_monthly', 'pro_yearly', 'ultra_monthly', 'ultra_yearly']),
});
