import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.ts';
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, hashRefreshToken } from '../../src/lib/auth.ts';
import { z } from 'zod';
import axios from 'axios';
import speakeasy from 'speakeasy';
import { registerSchema, loginSchema, normalizePhone, isEmailInput } from '../../src/lib/validations.ts';
import { auditLog } from '../lib/audit.ts';

const router = Router();

const isProduction = process.env.NODE_ENV === 'production';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' as const : 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const body = { ...req.body, emailOrPhone: req.body.emailOrPhone ?? req.body.email };
    const { fullName, emailOrPhone: raw, password } = registerSchema.parse(body);
    const isEmail = isEmailInput(raw);
    const email = isEmail ? raw.toLowerCase().trim() : null;
    const phone = isEmail ? null : normalizePhone(raw);

    // Check if user exists (by email or phone)
    const existingUser = email
      ? await prisma.user.findUnique({ where: { email } })
      : await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({ error: isEmail ? 'Email already registered' : 'Phone number already registered' });
    }

    // Hash password
    const { hash, salt } = await hashPassword(password);

    // Create user (at least one of email or phone)
    const user = await prisma.user.create({
      data: {
        fullName,
        email: email ?? undefined,
        phone: phone || undefined,
        passwordHash: hash,
        salt
      }
    });

    const loginId = user.email ?? user.phone ?? '';
    const accessToken = generateAccessToken({ id: user.id, email: loginId });
    const refreshToken = generateRefreshToken();

    const refreshHash = hashRefreshToken(refreshToken);
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshHash,
        ipHash: req.ip || 'unknown',
        userAgentHash: req.headers['user-agent'] || 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.cookie('refreshToken', refreshToken, getCookieOptions());

    res.status(201).json({
      accessToken,
      user: { id: user.id, email: user.email ?? undefined, phone: user.phone ?? undefined, fullName: user.fullName, username: user.username ?? undefined }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const body = { ...req.body, emailOrPhone: req.body.emailOrPhone ?? req.body.email };
    const { emailOrPhone: raw, password } = loginSchema.parse(body);
    const isEmail = isEmailInput(raw);
    const email = isEmail ? raw.toLowerCase().trim() : null;
    const phone = isEmail ? null : normalizePhone(raw);

    const user = email
      ? await prisma.user.findUnique({ where: { email } })
      : await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email/phone or password' });
    }
    if (!user.passwordHash || !user.salt) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      return res.json({
        twoFactorRequired: true,
        userId: user.id,
      });
    }

    const loginId = user.email ?? user.phone ?? '';
    const accessToken = generateAccessToken({ id: user.id, email: loginId });
    const refreshToken = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshToken);
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshHash,
        ipHash: req.ip || 'unknown',
        userAgentHash: req.headers['user-agent'] || 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.cookie('refreshToken', refreshToken, getCookieOptions());

    await auditLog({ userId: user.id, action: 'login', req, result: 'success' });
    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
        fullName: user.fullName,
        username: user.username ?? undefined,
        onboardingCompleted: user.onboardingCompleted
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Login 2FA: verify TOTP then create session (no Bearer required)
router.post('/2fa/verify', async (req: Request, res: Response) => {
  try {
    const { userId, token } = req.body as { userId?: string; token?: string };
    if (!userId || !token || typeof token !== 'string' || token.length !== 6) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true, fullName: true, username: true, twoFactorSecret: true, onboardingCompleted: true },
    });

    if (!user?.twoFactorSecret) {
      return res.status(401).json({ error: 'Invalid or expired' });
    }

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
    });

    if (!valid) {
      return res.status(401).json({ error: 'Invalid code' });
    }

    const loginId = user.email ?? user.phone ?? '';
    const accessToken = generateAccessToken({ id: user.id, email: loginId });
    const refreshToken = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshToken);
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshHash,
        ipHash: req.ip || 'unknown',
        userAgentHash: req.headers['user-agent'] || 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie('refreshToken', refreshToken, getCookieOptions());
    await auditLog({ userId: user.id, action: 'login_2fa', req, result: 'success' });
    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
        fullName: user.fullName,
        username: user.username ?? undefined,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error('2FA verify login error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const refreshHash = hashRefreshToken(refreshToken);
    const session = await prisma.session.findUnique({
      where: { refreshTokenHash: refreshHash },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const loginId = session.user.email ?? session.user.phone ?? '';
    const accessToken = generateAccessToken({ id: session.user.id, email: loginId });
    res.json({ accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    let userId: string | null = null;
    if (refreshToken) {
      const refreshHash = hashRefreshToken(refreshToken);
      const session = await prisma.session.findUnique({ where: { refreshTokenHash: refreshHash }, select: { userId: true } });
      if (session) userId = session.userId;
      await prisma.session.deleteMany({ where: { refreshTokenHash: refreshHash } });
    }
    if (userId) await auditLog({ userId, action: 'logout', req, result: 'success' });
    res.clearCookie('refreshToken', getCookieOptions());
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const refreshHash = hashRefreshToken(refreshToken);
    const session = await prisma.session.findUnique({
      where: { refreshTokenHash: refreshHash },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const loginId = session.user.email ?? session.user.phone ?? '';
    const accessToken = generateAccessToken({ id: session.user.id, email: loginId });
    res.json({
      accessToken,
      user: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        phone: session.user.phone ?? undefined,
        fullName: session.user.fullName,
        username: session.user.username ?? undefined,
        onboardingCompleted: session.user.onboardingCompleted
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ error: 'Auth check failed' });
  }
});

// Google OAuth URL
router.get('/google/url', (req: Request, res: Response) => {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
  };

  const qs = new URLSearchParams(options);
  res.json({ url: `${rootUrl}?${qs.toString()}` });
});

// Google OAuth Callback
router.get('/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send('No code provided');

  try {
    // Exchange code for tokens
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    });

    const { access_token } = tokenRes.data;

    // Get user info
    const userRes = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const googleUser = userRes.data; // { id, email, name, picture }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: googleUser.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          fullName: googleUser.name,
          onboardingCompleted: false,
        },
      });
    }

    const refreshToken = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshToken);
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshHash,
        ipHash: req.ip || 'unknown',
        userAgentHash: req.headers['user-agent'] || 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie('refreshToken', refreshToken, getCookieOptions());

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Google OAuth error', err);
    res.status(500).send('Authentication failed');
  }
});

export default router;
