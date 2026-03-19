/**
 * Auth API request schemas.
 */
import { z } from 'zod';

/**
 * Blocked disposable/temporary email domains.
 * Only well-known, reputable providers are allowed.
 */
const ALLOWED_EMAIL_DOMAINS = new Set([
  // Google
  'gmail.com', 'googlemail.com',
  // Microsoft
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de',
  'live.com', 'live.co.uk', 'live.fr', 'live.de', 'live.nl', 'live.se',
  'msn.com', 'passport.com',
  // Yahoo
  'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'yahoo.es', 'yahoo.it',
  'yahoo.com.au', 'yahoo.ca', 'ymail.com', 'rocketmail.com',
  // Apple
  'icloud.com', 'me.com', 'mac.com',
  // Other reputable
  'proton.me', 'protonmail.com', 'protonmail.ch',
  'tutanota.com', 'tutamail.com', 'tuta.io',
  'zoho.com', 'zohomail.com',
  'aol.com', 'aim.com',
  'gmx.com', 'gmx.de', 'gmx.net', 'gmx.at',
  'web.de', 'mail.com',
  'fastmail.com', 'fastmail.fm',
  'hey.com',
  // Egyptian / Arab ISPs
  'link.net', 'tedata.net', 'vodafone.com.eg',
  // Educational / org (allow broadly by checking .edu / .org? No — keep strict)
]);

function isAllowedEmailDomain(email: string): boolean {
  const at = email.lastIndexOf('@');
  if (at === -1) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.has(domain);
}

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

const emailOrPhoneForRegister = emailOrPhone.superRefine((val, ctx) => {
  if (val.includes('@') && !isAllowedEmailDomain(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Temporary or unsupported email providers are not allowed. Please use Gmail, Outlook, Yahoo, or another trusted provider.',
    });
  }
});

/** POST /api/auth/register — request body. */
export const registerBodySchema = z.object({
  fullName: z
    .string()
    .min(3, 'Full name must be at least 3 characters')
    .max(50)
    .regex(/^[a-zA-Z\s\u0600-\u06FF]+$/, 'Full name: letters and spaces only'),
  emailOrPhone: emailOrPhoneForRegister,
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
