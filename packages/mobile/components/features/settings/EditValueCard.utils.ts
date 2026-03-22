import { z } from 'zod';
import { normalizePhone, isValidEgyptianPhone } from '../../../lib/validations';

export type EditableField = 'fullName' | 'username' | 'email' | 'phone';

export function getFieldTitle(field: EditableField) {
  switch (field) {
    case 'fullName':
      return 'الاسم الكامل';
    case 'username':
      return 'اسم المستخدم';
    case 'email':
      return 'البريد الإلكتروني';
    case 'phone':
      return 'رقم الموبايل';
  }
}

export function getEditSchema(field: EditableField) {
  if (field === 'email') {
    return z.object({
      value: z
        .string()
        .transform((s) => s.trim().toLowerCase())
        .refine((s) => s === '' || z.string().email().safeParse(s).success, {
          message: 'البريد الإلكتروني غير صالح',
        }),
    });
  }

  if (field === 'phone') {
    return z.object({
      value: z
        .string()
        .transform((s) => s.trim())
        .transform((s) => (s ? normalizePhone(s) : ''))
        .refine((digits) => digits === '' || isValidEgyptianPhone(digits), { message: 'رقم الموبايل غير صالح' }),
    });
  }

  if (field === 'username') {
    return z.object({
      value: z.preprocess(
        (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
        z
          .string()
          .min(6, 'اسم المستخدم مطلوب')
          .max(18, 'اسم المستخدم طويل')
          .regex(/^[a-zA-Z0-9_-]+$/, 'اسم المستخدم غير صالح'),
      ),
    });
  }

  return z.object({
    value: z.preprocess(
      (v) => (typeof v === 'string' ? v.trim() : v),
      z
        .string()
        .min(3, 'الاسم مطلوب')
        .max(50, 'الاسم طويل')
        .regex(/^[a-zA-Z\s\u0600-\u06FF]+$/, 'الاسم غير صالح'),
    ),
  });
}

export const EDIT_PLACEHOLDERS: Record<EditableField, string> = {
  fullName: 'مثال: أحمد محمد',
  username: 'مثال: ahmed_egypt',
  email: 'example@email.com',
  phone: 'مثال: 01012345678',
};

export const EDIT_KEYBOARD_TYPES: Record<EditableField, any> = {
  fullName: 'default',
  username: 'default',
  email: 'email-address',
  phone: 'phone-pad',
};
