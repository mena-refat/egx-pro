import { z } from 'zod';

/** Normalize Egyptian mobile phone:
 * - Accepts formats like 010xxxxxxxx, 2010xxxxxxxx, +2010xxxxxxxx
 * - Always returns 11-digit local format: 01xxxxxxxxx
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('01')) return digits;
  if (digits.length === 12 && digits.startsWith('201')) return '0' + digits.slice(2);
  if (digits.length === 13 && digits.startsWith('20')) return '0' + digits.slice(2);
  if (digits.length === 10 && digits.startsWith('1')) return '0' + digits;
  return digits;
}

export function isValidEgyptianPhone(phone: string): boolean {
  return /^01[0125][0-9]{8}$/.test(phone);
}

export function isEmailInput(s: string): boolean {
  return s.trim().includes('@');
}

export const passwordSchema = z
  .string()
  .min(8, 'كلمة المرور 8 أحرف على الأقل')
  .max(255, 'Password too long')
  .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير واحد على الأقل')
  .regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد على الأقل');

export function validateRegisterPassword(
  password: string,
  emailOrPhone: string
): { ok: true } | { ok: false; message: string } {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'كلمة المرور غير صالحة';
    return { ok: false, message: msg };
  }
  const normalized = emailOrPhone.trim().toLowerCase();
  if (password.trim().toLowerCase() === normalized) {
    return { ok: false, message: 'كلمة المرور لا يجوز أن تكون مثل البريد أو رقم الموبايل' };
  }
  return { ok: true };
}

export function validateChangePassword(
  newPassword: string,
  opts: { email?: string | null; username?: string | null }
): { ok: true } | { ok: false; message: string } {
  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'كلمة المرور غير صالحة';
    return { ok: false, message: msg };
  }
  const p = newPassword.trim().toLowerCase();
  if (opts.email && p === opts.email.trim().toLowerCase()) {
    return { ok: false, message: 'كلمة المرور لا يجوز أن تكون مثل البريد الإلكتروني' };
  }
  if (opts.username && p === opts.username.trim().toLowerCase()) {
    return { ok: false, message: 'كلمة المرور لا يجوز أن تكون مثل اسم المستخدم' };
  }
  return { ok: true };
}

const emailOrPhoneSchema = z.preprocess(
  (v) => (v === undefined || v === null ? '' : v),
  z.string()
    .min(1, 'Email or phone is required')
    .max(255, 'Email or phone too long')
    .transform((s) => (typeof s === 'string' ? s.trim() : ''))
    .refine(
      (s) => {
        if (!s) return false;
        if (s.includes('@')) return z.string().email().safeParse(s).success;
        const digits = s.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
      },
      { message: 'Enter a valid email or phone number (e.g. 01xxxxxxxx or +20...)' }
    )
);

export const registerSchema = z.object({
  fullName: z.preprocess(
    (v) => (v === undefined || v === null ? '' : v),
    z.string()
      .min(3, 'Full name must be at least 3 characters')
      .max(50, 'Full name must be less than 50 characters')
      .regex(/^[a-zA-Z\s\u0600-\u06FF]+$/, 'Full name can only contain letters and spaces')
  ),
  emailOrPhone: emailOrPhoneSchema,
  password: z.preprocess(
    (v) => (v === undefined || v === null ? '' : v),
    z.string().min(1, 'كلمة المرور مطلوبة').max(255, 'Password too long')
  ),
  referralCode: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  emailOrPhone: emailOrPhoneSchema,
  password: z.preprocess(
    (v) => (v === undefined || v === null ? '' : v),
    z.string().min(1, 'Password is required').max(255, 'Password too long')
  ),
});

export const portfolioSchema = z.object({
  ticker: z.string().min(2, 'Ticker must be at least 2 characters').max(20).toUpperCase(),
  shares: z.number().positive('Shares must be positive'),
  avgPrice: z.number().positive('Average price must be positive'),
  buyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
});

export const PORTFOLIO_QUANTITY_ERROR_KEYS = {
  quantityRequired: 'portfolio.errors.quantityRequired',
  quantityInt: 'portfolio.errors.quantityInt',
  quantityMin: 'portfolio.errors.quantityMin',
  quantityMax: 'portfolio.errors.quantityMax',
} as const;

export const addHoldingSchema = z.object({
  ticker: z.string().min(2).max(20).transform((s) => s.toUpperCase()),
  shares: z
    .coerce
    .number({ message: PORTFOLIO_QUANTITY_ERROR_KEYS.quantityRequired })
    .int(PORTFOLIO_QUANTITY_ERROR_KEYS.quantityInt)
    .min(1, PORTFOLIO_QUANTITY_ERROR_KEYS.quantityMin)
    .max(1_000_000, PORTFOLIO_QUANTITY_ERROR_KEYS.quantityMax),
  purchasePrice: z.coerce.number().positive('Price must be positive'),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .refine((dateStr) => dateStr <= new Date().toISOString().slice(0, 10), {
      message: 'Purchase date cannot be in the future',
    }),
});

export const watchlistTickerSchema = z.object({
  ticker: z.string().min(2, 'Ticker must be at least 2 characters').max(20).toUpperCase(),
  targetPrice: z.number().positive().optional(),
});

export const watchlistCheckTargetsSchema = z.object({
  items: z.array(z.object({
    ticker: z.string().min(1).max(20),
    targetPrice: z.number().positive(),
    currentPrice: z.number().nonnegative(),
  })),
});

export const USERNAME_MAX_LENGTH = 18;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export const usernameSchema = z.string()
  .min(6, 'Username must be at least 6 characters')
  .max(USERNAME_MAX_LENGTH, `Username must be at most ${USERNAME_MAX_LENGTH} characters`)
  .regex(USERNAME_REGEX, 'Username: English letters, numbers, _ and - only')
  .transform((s) => s.trim().toLowerCase());

const goalCategoryEnum = z.enum(['home', 'car', 'retirement', 'wealth', 'travel', 'other']);

export const goalSchema = z.object({
  title: z.string().min(3, 'Goal title must be at least 3 characters').max(500, 'Goal title too long'),
  category: goalCategoryEnum.default('home'),
  targetAmount: z.coerce.number().positive('Target amount must be positive'),
  currentAmount: z.coerce.number().min(0).optional().default(0),
  currency: z.string().optional().default('EGP'),
  deadline: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === undefined ? null : v)),
});

export const goalUpdateSchema = z.object({
  title: z.string().min(3).max(500).optional(),
  category: goalCategoryEnum.optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.null()),
});

export const goalAmountSchema = z.object({
  currentAmount: z.number().min(0),
});

export const usernameSearchQuerySchema = z.object({
  q: z.string().max(100),
  limit: z.coerce.number().int().min(1).max(5).default(5),
});
