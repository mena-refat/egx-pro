import { Resend } from 'resend';
import { logger } from '../lib/logger.ts';

/** يُنشأ فقط في الإنتاج عند وجود المفتاح حتى لا يرمي Resend خطأ في الـ dev */
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key || process.env.NODE_ENV !== 'production') return null;
  return new Resend(key);
}
const FROM = process.env.FROM_EMAIL ?? 'noreply@egxpro.com';

export const EmailService = {

  async sendVerificationCode(email: string, code: string): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      logger.info('[EmailService DEV] Verification code', { email, code });
      return;
    }
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'كود التحقق من البريد الإلكتروني — Borsa',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
          <h2 style="color: #7c3aed; margin-bottom: 8px;">Borsa</h2>
          <p style="color: #333; font-size: 16px;">كود التحقق من بريدك الإلكتروني:</p>
          <div style="background: #fff; border: 2px solid #7c3aed; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #7c3aed;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">الكود صالح لمدة 15 دقيقة.</p>
          <p style="color: #666; font-size: 14px;">لو ما طلبتش هذا الكود، تجاهل هذا الإيميل.</p>
        </div>
      `,
    });
  },

  async sendWelcome(email: string, name: string): Promise<void> {
    if (process.env.NODE_ENV !== 'production') return;
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `أهلاً ${name}! مرحباً بك في Borsa`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #7c3aed;">أهلاً ${name}! 🎉</h2>
          <p style="color: #333; font-size: 16px;">مرحباً بك في Borsa — منصتك لتحليل البورصة والاستثمار.</p>
          <p style="color: #333;">ابدأ بإضافة أسهمك في المحفظة وتفعيل تنبيهات الأسعار.</p>
          <a href="${process.env.APP_URL}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">ابدأ الآن</a>
        </div>
      `,
    });
  },

  async sendPasswordChanged(email: string): Promise<void> {
    if (process.env.NODE_ENV !== 'production') return;
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'تم تغيير كلمة المرور — Borsa',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #dc2626;">⚠️ تنبيه أمني</h2>
          <p style="color: #333; font-size: 16px;">تم تغيير كلمة المرور لحسابك على Borsa.</p>
          <p style="color: #333;">لو ما غيّرتش كلمة المرور بنفسك، تواصل معنا فوراً.</p>
          <p style="color: #666; font-size: 13px;">وقت التغيير: ${new Date().toLocaleString('ar-EG')}</p>
        </div>
      `,
    });
  },

};
