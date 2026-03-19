import { randomUUID, randomBytes } from 'node:crypto';
import { UserRepository } from '../repositories/user.repository.ts';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository.ts';
import { generateRefreshToken, hashRefreshToken } from '../lib/auth.ts';
import { setCache, getCache, deleteCache } from '../lib/redis.ts';
import { EmailService } from './email.service.ts';
import { logger } from '../lib/logger.ts';
import { buildRefreshTokenData } from '../lib/refreshTokenData.ts';
import { AppError } from '../lib/errors.ts';
import { REFRESH_TOKEN_AGE_MS, type AuthContext } from './auth.shared.ts';

export async function getGoogleUrl(): Promise<{ url: string; state: string }> {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const state = randomBytes(16).toString('hex');
  const options = {
    redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    state,
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
  };
  const qs = new URLSearchParams(options);
  await setCache(`oauth_state:${state}`, '1', 600);
  return { url: `${rootUrl}?${qs.toString()}`, state };
}

export async function googleCallback(
  code: string,
  state: string,
  ctx: AuthContext
): Promise<{ redirectHtml: string; refreshToken: string }> {
  if (!state) throw new AppError('INVALID_STATE', 400);
  const cachedState = await getCache<string>(`oauth_state:${state}`);
  if (!cachedState) throw new AppError('INVALID_STATE', 400, 'OAuth state expired or invalid');
  await deleteCache(`oauth_state:${state}`);

  const axios = (await import('axios')).default;
  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
    grant_type: 'authorization_code',
  });
  const { access_token } = tokenRes.data;
  const userRes = await axios.get(
    `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  const googleUser = userRes.data;

  let user = await UserRepository.findUnique({ where: { email: googleUser.email } });
  if (!user) {
    const referralCode = `EGX-${randomUUID().slice(0, 8).toUpperCase()}`;
    user = await UserRepository.create({
      data: {
        email: googleUser.email,
        fullName: googleUser.name,
        onboardingCompleted: false,
        referralCode,
        isEmailVerified: true,
      },
    });
    EmailService.sendWelcome(user.email!, user.fullName ?? 'مستخدم').catch((err) =>
      logger.error('Failed to send welcome email', { err })
    );
  } else {
    const needsEmailVerificationUpdate = user.isEmailVerified === false;
    const needsReferralCode = !user.referralCode;
    if (needsEmailVerificationUpdate || needsReferralCode) {
      const updateData: Record<string, unknown> = {};
      if (needsEmailVerificationUpdate) updateData.isEmailVerified = true;
      if (needsReferralCode) updateData.referralCode = `EGX-${randomUUID().slice(0, 8).toUpperCase()}`;
      user = await UserRepository.update({ where: { id: user.id }, data: updateData });
    }
  }

  const refreshToken = generateRefreshToken();
  const refreshHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_AGE_MS);
  const userId = user?.id;
  if (!userId) throw new Error('Unauthorized');
  const refreshData = await buildRefreshTokenData(userId, refreshHash, expiresAt, ctx.ip, ctx.userAgent).catch(() =>
    buildRefreshTokenData(userId, refreshHash, expiresAt, null, ctx.userAgent)
  );
  await RefreshTokenRepository.create(refreshData);
  await UserRepository.update({
    where: { id: userId },
    data: { lastLoginAt: new Date(), lastLoginIp: ctx.ip || null },
  });

  const origin = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  const redirectHtml = `
    <html>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, ${JSON.stringify(origin)});
            window.close();
          } else {
            window.location.href = '/';
          }
        </script>
        <p>Authentication successful. This window should close automatically.</p>
      </body>
    </html>
  `;
  return { redirectHtml, refreshToken };
}
