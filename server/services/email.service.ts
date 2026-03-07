// Email service — stub: implement with your provider (e.g. Resend, SendGrid, nodemailer)

export const EmailService = {
  async sendVerificationCode(email: string, code: string): Promise<void> {
    // TODO: send email via your provider
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EmailService] Verification code for ${email}: ${code}`);
    }
  },
};
