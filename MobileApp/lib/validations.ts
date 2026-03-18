import { z } from 'zod';

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

export const loginSchema = z.object({
  emailOrPhone: z.string().min(1, 'البريد أو الموبايل مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'الاسم مطلوب').max(100),
  emailOrPhone: z.string().min(1, 'البريد أو الموبايل مطلوب'),
  password: passwordSchema,
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;

export function validateRegisterPassword(
  password: string,
  emailOrPhone: string,
): { ok: true } | { ok: false; message: string } {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'كلمة المرور غير صالحة' };
  }
  if (password.trim().toLowerCase() === emailOrPhone.trim().toLowerCase()) {
    return { ok: false, message: 'كلمة المرور لا يجوز أن تكون مثل البريد أو رقم الموبايل' };
  }
  return { ok: true };
}

export function validateChangePassword(
  password: string,
  ctx: { email?: string | null; username?: string },
): { ok: true } | { ok: false; message: string } {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'كلمة المرور غير صالحة' };
  }
  if (ctx.email && password.trim().toLowerCase() === ctx.email.trim().toLowerCase()) {
    return { ok: false, message: 'كلمة المرور لا يجوز أن تكون مثل البريد الإلكتروني' };
  }
  if (ctx.username && password.trim().toLowerCase() === ctx.username.trim().toLowerCase()) {
    return { ok: false, message: 'كلمة المرور لا يجوز أن تكون مثل اسم المستخدم' };
  }
  return { ok: true };
}

