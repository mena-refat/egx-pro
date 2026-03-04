import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.ts';
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken } from '../../src/lib/auth.ts';
import { z } from 'zod';
import axios from 'axios';
import { registerSchema, loginSchema } from '../../src/lib/validations.ts';

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
    const { fullName, email: rawEmail, password } = registerSchema.parse(req.body);
    const email = rawEmail.toLowerCase().trim();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const { hash, salt } = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash: hash,
        salt
      }
    });

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email });
    const refreshToken = generateRefreshToken();

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshToken, // Should hash this in production
        ipHash: req.ip || 'unknown',
        userAgentHash: req.headers['user-agent'] || 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    res.cookie('refreshToken', refreshToken, getCookieOptions());

    res.status(201).json({ accessToken, user: { id: user.id, email: user.email, fullName: user.fullName } });
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
    const { email: rawEmail, password } = loginSchema.parse(req.body);
    const email = rawEmail.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (!user.passwordHash || !user.salt) {
      return res.status(401).json({ error: 'User has no password set (try Google login)' });
    }

    const isValid = await verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const accessToken = generateAccessToken({ id: user.id, email: user.email });
    const refreshToken = generateRefreshToken();

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshToken,
        ipHash: req.ip || 'unknown',
        userAgentHash: req.headers['user-agent'] || 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.cookie('refreshToken', refreshToken, getCookieOptions());

    res.json({ accessToken, user: { id: user.id, email: user.email, fullName: user.fullName } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const session = await prisma.session.findUnique({
      where: { refreshTokenHash: refreshToken },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const accessToken = generateAccessToken({ id: session.user.id, email: session.user.email });
    res.json({ accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      await prisma.session.delete({ where: { refreshTokenHash: refreshToken } });
    }
    res.clearCookie('refreshToken', getCookieOptions());
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const session = await prisma.session.findUnique({
      where: { refreshTokenHash: refreshToken },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const accessToken = generateAccessToken({ id: session.user.id, email: session.user.email });
    res.json({ 
      accessToken, 
      user: { 
        id: session.user.id, 
        email: session.user.email, 
        fullName: session.user.fullName,
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

    // Create session
    const refreshToken = generateRefreshToken();
    
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshToken,
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
