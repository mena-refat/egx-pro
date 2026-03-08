import { z } from 'zod';

/** Normalize Egyptian mobile phone:
 * - Accepts formats like 010xxxxxxxx, 2010xxxxxxxx, +2010xxxxxxxx
 * - Always returns 11-digit local format: 01xxxxxxxxx
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  // 01xxxxxxxxx (11 digits)
  if (digits.length === 11 && digits.startsWith('01')) {
    return digits;
  }
  // 2010xxxxxxxx (12 digits with country code) -> 010xxxxxxxx
  if (digits.length === 12 && digits.startsWith('201')) {
    return '0' + digits.slice(2);
  }
  // 2010123456789 (13 digits) -> 010123456789
  if (digits.length === 13 && digits.startsWith('20')) {
    return '0' + digits.slice(2);
  }
  // 10xxxxxxxx (10 digits, Egyptian without leading 0) -> 010xxxxxxxx
  if (digits.length === 10 && digits.startsWith('1')) {
    return '0' + digits;
  }
  return digits;
}

export function isValidEgyptianPhone(phone: string): boolean {
  return /^01[0125][0-9]{8}$/.test(phone);
}

/** Check if input looks like email */
export function isEmailInput(s: string): boolean {
  return s.trim().includes('@');
}

/** كلمة المرور: 8+ أحرف، حرف كبير واحد على الأقل، رقم واحد على الأقل */
export const passwordSchema = z
  .string()
  .min(8, 'كلمة المرور 8 أحرف على الأقل')
  .max(255, 'Password too long')
  .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير واحد على الأقل')
  .regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد على الأقل');

/** التحقق من كلمة المرور عند التسجيل (لا تكون مثل البريد أو الموبايل) */
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

/** التحقق من كلمة المرور عند التغيير (لا تكون مثل البريد أو اسم المستخدم) */
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

export const addHoldingSchema = z.object({
  ticker: z.string().min(2).max(20).transform((s) => s.toUpperCase()),
  shares: z.coerce.number().positive('Shares must be positive'),
  purchasePrice: z.coerce.number().positive('Price must be positive'),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
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

/** Username: 3–20 chars, English letters (upper/lower), numbers, _ and - only; stored lowercase for uniqueness */
export const USERNAME_MAX_LENGTH = 20;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(USERNAME_MAX_LENGTH, `Username must be at most ${USERNAME_MAX_LENGTH} characters`)
  .regex(USERNAME_REGEX, 'Username: English letters, numbers, _ and - only')
  .transform((s) => s.trim().toLowerCase());

/** Validate username format on frontend (max 20, a-zA-Z0-9_-). Returns i18n key for error or null if valid. */
export function validateUsernameFormat(value: string): string | null {
  const s = value.trim();
  if (s.length === 0) return null;
  if (s.length > USERNAME_MAX_LENGTH) return 'settings.usernameMax20';
  if (s.length < 3) return 'settings.usernameMin3';
  if (!USERNAME_REGEX.test(s)) return 'settings.usernameInvalidChars';
  return null;
}

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
