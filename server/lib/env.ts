import { z } from 'zod';

/** متغيرات مطلوبة في الإنتاج فقط (مثل Resend) */
const requiredInProdSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  FROM_EMAIL: z.string().email(),
});

/**
 * Validate required environment variables at startup.
 * أي secret مش موجود يطلع error واضح وقت التشغيل.
 */
export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const missing: string[] = [];

  if (!process.env.DATABASE_URL?.trim()) {
    missing.push('DATABASE_URL');
  }

  const jwtSecret = process.env.JWT_ACCESS_TOKEN_SECRET?.trim();
  const jwtPrivate = process.env.JWT_PRIVATE_KEY?.trim();
  const jwtPublic = process.env.JWT_PUBLIC_KEY?.trim();
  const hasJwt = (jwtSecret && jwtSecret.length > 0) || (jwtPrivate && jwtPublic);
  if (!hasJwt) {
    missing.push('JWT_PRIVATE_KEY + JWT_PUBLIC_KEY أو JWT_ACCESS_TOKEN_SECRET');
  }

  const frontendUrl = process.env.FRONTEND_URL?.trim() || process.env.APP_URL?.trim();
  if (!frontendUrl) {
    missing.push('FRONTEND_URL أو APP_URL');
  }

  if (isProd && (!process.env.AUTH_PEPPER || process.env.AUTH_PEPPER === 'default-pepper-if-missing')) {
    missing.push('AUTH_PEPPER (يجب تعيينه وقيمة غير افتراضية في الإنتاج)');
  }

  if (isProd) {
    const prodResult = requiredInProdSchema.safeParse({
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      FROM_EMAIL: process.env.FROM_EMAIL,
    });
    if (!prodResult.success) {
      const keys = prodResult.error.issues.map((e) => e.path.join('.')).filter(Boolean);
      keys.forEach((k) => missing.push(k));
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `متغيرات بيئة مطلوبة ناقصة أو غير صالحة: ${missing.join(', ')}. ` +
      'راجع .env و .env.local و .env.production.'
    );
  }
}
