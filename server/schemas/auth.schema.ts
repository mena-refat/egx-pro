/**
 * Auth API request schemas.
 */
import { z } from 'zod';

const emailOrPhone = z
  .string()
  .min(1, 'Email or phone is required')
  .max(255)
  .transform((s) => (typeof s === 'string' ? s.trim() : ''))
  .refine(
    (s) => {
      if (!s) return false;
      if (s.includes('@')) return z.string().email().safeParse(s).success;
      const digits = s.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    },
    { message: 'Enter a valid email or phone number' }
  );

/** POST /api/auth/register — request body. */
export const registerBodySchema = z.object({
  fullName: z
    .string()
    .min(3, 'Full name must be at least 3 characters')
    .max(50)
    .regex(/^[a-zA-Z\s\u0600-\u06FF]+$/, 'Full name: letters and spaces only'),
  emailOrPhone,
  password: z.string().min(1, 'Password is required').max(255),
  referralCode: z.string().max(20).optional(),
});

export const loginBodySchema = z.object({
  emailOrPhone,
  password: z.string().min(1, 'Password is required').max(255),
});

/** POST /api/auth/verify-email/confirm — request body. */
export const verifyEmailConfirmBodySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/),
});

/** POST /api/auth/change-password — request body. */
export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password at least 8 characters').max(255),
});

export const twoFaVerifyBodySchema = z.object({
  code: z.string().min(1, 'Code is required').max(10),
});

/** 2FA setup — request body. */
export const twoFaSetupBodySchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

/** 2FA authenticate — request body. */
export const twoFaAuthenticateBodySchema = z.object({
  tempToken: z.string().min(1, 'Temp token is required'),
  code: z.string().min(1, 'Code is required').max(10),
});
