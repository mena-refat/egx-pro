/**
 * Billing API request schemas.
 */
import { z } from 'zod';

const discountCodeField = z
  .string()
  .min(18, 'Discount code must be at least 18 characters')
  .max(30, 'Discount code must be at most 30 characters')
  .regex(/^[A-Z0-9]+$/, 'Discount code must contain only uppercase English letters and digits');

export const validateDiscountBodySchema = z.object({
  code: discountCodeField.optional(),
  plan: z.enum(['pro', 'annual', 'ultra', 'ultra_annual']).optional(),
});

export const upgradeBodySchema = z.object({
  plan: z.enum(['pro_monthly', 'pro_yearly', 'ultra_monthly', 'ultra_yearly', 'pro', 'annual']),
  discountCode: discountCodeField.optional(),
  paymentToken: z.string().max(500).optional(),
});

export const googlePlayVerifySchema = z.object({
  purchaseToken: z.string().min(1).max(2000),
  productId: z.enum(['borsa_pro_monthly', 'borsa_pro_yearly', 'borsa_ultra_monthly', 'borsa_ultra_yearly']),
});
