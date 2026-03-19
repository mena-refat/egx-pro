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

  async sendUserInvite(
    email: string,
    name: string,
    tempPassword: string,
    options: {
      forcePasswordChange: boolean;
      force2FA: boolean;
      pwdMinLength: boolean;
      pwdUppercase: boolean;
      pwdLowercase: boolean;
      pwdSymbols: boolean;
    },
  ): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      logger.info('[EmailService DEV] User invite', { email, name, tempPassword, options });
      return;
    }
    const resend = getResend();
    if (!resend) return;

    const requirements: string[] = [];
    if (options.forcePasswordChange) requirements.push('تغيير كلمة المرور فور تسجيل الدخول الأول');
    if (options.pwdMinLength)  requirements.push('كلمة المرور بين 18 و 64 حرفاً');
    if (options.pwdUppercase)  requirements.push('تحتوي على حرف كبير على الأقل (A-Z)');
    if (options.pwdLowercase)  requirements.push('تحتوي على حرف صغير على الأقل (a-z)');
    if (options.pwdSymbols)    requirements.push('تحتوي على رمز خاص على الأقل (!@#$%...)');
    if (options.force2FA) requirements.push('تفعيل التحقق الثنائي (2FA) قبل استخدام التطبيق');

    const reqList = requirements.map((r) => `<li style="margin-bottom:4px;">${r}</li>`).join('');

    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'دعوتك للانضمام إلى Borsa',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
          <h2 style="color: #7c3aed; margin-bottom: 4px;">Borsa</h2>
          <p style="color: #333; font-size: 16px;">أهلاً ${name || ''}،</p>
          <p style="color: #333;">تم إنشاء حساب لك على منصة Borsa. استخدم البيانات التالية لتسجيل الدخول:</p>
          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:20px; margin:20px 0;">
            <p style="margin:0 0 8px; color:#64748b; font-size:13px;">البريد الإلكتروني</p>
            <p style="margin:0 0 16px; font-weight:bold; color:#1e293b;">${email}</p>
            <p style="margin:0 0 8px; color:#64748b; font-size:13px;">كلمة المرور المؤقتة</p>
            <p style="margin:0; font-family:monospace; font-size:18px; font-weight:bold; letter-spacing:2px; color:#7c3aed; background:#f5f3ff; padding:10px 16px; border-radius:6px; display:inline-block;">${tempPassword}</p>
          </div>
          ${requirements.length > 0 ? `
          <p style="color:#333; font-weight:bold;">بعد تسجيل الدخول ستحتاج إلى:</p>
          <ul style="color:#333; padding-right:20px; line-height:1.8;">${reqList}</ul>
          ` : ''}
          <p style="color:#ef4444; font-size:13px; margin-top:16px;">⚠️ لا تشارك كلمة المرور المؤقتة مع أي أحد.</p>
          <a href="${process.env.APP_URL}" style="display:inline-block; background:#7c3aed; color:white; padding:12px 28px; border-radius:8px; text-decoration:none; margin-top:16px; font-weight:bold;">تسجيل الدخول الآن</a>
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
