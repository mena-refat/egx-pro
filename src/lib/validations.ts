import { z } from 'zod';

/** Normalize Egyptian mobile phone:
 * - Accepts formats like 010xxxxxxxx, 2010xxxxxxxx, +2010xxxxxxxx
 * - Always returns 11-digit local format: 01xxxxxxxxx
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  // 01xxxxxxxxx
  if (digits.length === 11 && digits.startsWith('01')) {
    return digits;
  }
  // 2010xxxxxxxx (with country code) -> 010xxxxxxxx
  if (digits.length === 12 && digits.startsWith('201')) {
    return '0' + digits.slice(2);
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
    z.string().min(1, 'كلمة المرور مطلوبة')
  ),
});

export const loginSchema = z.object({
  emailOrPhone: emailOrPhoneSchema,
  password: z.preprocess(
    (v) => (v === undefined || v === null ? '' : v),
    z.string().min(1, 'Password is required')
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
    ticker: z.string(),
    targetPrice: z.number().positive(),
    currentPrice: z.number().nonnegative(),
  })),
});

/** Username: 3–30 chars, letters/numbers/underscore only; stored without @ */
export const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscore')
  .transform((s) => s.trim().toLowerCase());

export const goalSchema = z.object({
  name: z.string().min(3, 'Goal name must be at least 3 characters'),
  targetAmount: z.number().positive('Target amount must be positive'),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').or(z.date()),
  type: z.string().min(1, 'Goal type is required'),
});
