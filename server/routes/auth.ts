import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.ts';
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, hashRefreshToken, generate2FATempToken, verify2FATempToken, verifyAccessToken } from '../../src/lib/auth.ts';
import { z } from 'zod';
import axios from 'axios';
import speakeasy from 'speakeasy';
import { registerSchema, loginSchema, normalizePhone, isEmailInput, isValidEgyptianPhone, validateRegisterPassword } from '../../src/lib/validations.ts';
import { auditLog } from '../lib/audit.ts';
import { sanitizeUser } from '../lib/userSanitize.ts';

const router = Router();

const isProduction = process.env.NODE_ENV === 'production';

const REFRESH_TOKEN_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict' as const,
  maxAge: REFRESH_TOKEN_AGE_MS,
});

import { parseUserAgent } from '../lib/parseUserAgent.ts';
import { getGeoFromIp } from '../lib/geoFromIp.ts';
import qrcode from 'qrcode';

function getAuthUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = verifyAccessToken(authHeader.slice(7)) as { sub: string };
    return decoded.sub;
  } catch {
    return null;
  }
}

function getSessionDevice(req: Request): { deviceType: string; browser: string; os: string } {
  const ua = req.headers['user-agent'];
  return parseUserAgent(ua);
}

async function getRefreshTokenData(
  req: Request,
  userId: string,
  refreshHash: string,
  expiresAt: Date
): Promise<{
  token: string;
  userId: string;
  expiresAt: Date;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string | null;
  city?: string;
  country?: string;
}> {
  const geo = await getGeoFromIp(req.ip);
  return {
    token: refreshHash,
    userId,
    expiresAt,
    ...getSessionDevice(req),
    ipAddress: req.ip || null,
    ...(geo && { city: geo.city, country: geo.country }),
  };
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const body = { ...req.body, emailOrPhone: req.body.emailOrPhone ?? req.body.email };
    const { fullName, emailOrPhone: raw, password } = registerSchema.parse(body);
    const pwCheck = validateRegisterPassword(password, raw);
    if (!pwCheck.ok) {
      return res.status(400).json({ error: pwCheck.message });
    }
    const isEmail = isEmailInput(raw);
    const email = isEmail ? raw.toLowerCase().trim() : null;

    let phone: string | null = null;
    if (!isEmail) {
      const digitsOnly = raw.replace(/\D/g, '');
      if (!isValidEgyptianPhone(digitsOnly)) {
        return res.status(400).json({
          error: 'invalid_phone',
          message: 'رقم الموبايل غير صحيح',
        });
      }
      phone = normalizePhone(digitsOnly);
    }

    // Check if user exists (by email or phone)
    const existingUser = email
      ? await prisma.user.findUnique({ where: { email } })
      : await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({ error: isEmail ? 'Email already registered' : 'Phone number already registered' });
    }

    // Hash password
    const { hash, salt } = await hashPassword(password);

    const referralCode = `EGX-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const firstName = fullName.trim().split(/\s+/)[0] || 'user';
    const safeBase = firstName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
    let username = '';
    for (let i = 0; i < 100; i++) {
      const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
      const candidate = `${safeBase}-${digits}`;
      const exists = await prisma.user.findUnique({ where: { username: candidate } });
      if (!exists) {
        username = candidate;
        break;
      }
    }
    if (!username) username = `${safeBase}-${Date.now().toString().slice(-8)}`;

    const user = await prisma.user.create({
      data: {
        fullName,
        username,
        email: email ?? undefined,
        phone: phone || undefined,
        passwordHash: hash,
        salt,
        referralCode,
        lastPasswordChangeAt: new Date(),
      }
    });

    const loginId = user.email ?? user.phone ?? '';
    const accessToken = generateAccessToken({ id: user.id, email: loginId });
    const refreshToken = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_AGE_MS);

    await prisma.refreshToken.create({
      data: await getRefreshTokenData(req, user.id, refreshHash, expiresAt),
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: req.ip || null,
      },
    });

    res.cookie('refreshToken', refreshToken, getCookieOptions());

    const safe = sanitizeUser(user as Record<string, unknown>);
    res.status(201).json({
      accessToken,
      user: safe ?? {
        id: user.id,
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
        fullName: user.fullName,
        username: user.username ?? undefined,
        onboardingCompleted: user.onboardingCompleted,
        isFirstLogin: user.isFirstLogin,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

const LOCKOUT_MINUTES = 30;
const MAX_FAILED_ATTEMPTS = 5;

router.post('/login', async (req: Request, res: Response) => {
  try {
    const body = { ...req.body, emailOrPhone: req.body.emailOrPhone ?? req.body.email };
    const { emailOrPhone: raw, password } = loginSchema.parse(body);
    const isEmail = isEmailInput(raw);
    const email = isEmail ? raw.toLowerCase().trim() : null;
    const phone = isEmail ? null : normalizePhone(raw);

    let user = email
      ? await prisma.user.findUnique({ where: { email } })
      : await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      await auditLog({ action: 'LOGIN_FAILED', req, result: 'failure', details: 'user_not_found' });
      return res.status(401).json({
        error: 'account_not_found',
        message: 'الحساب ده مش موجود. تقدر تسجّل حساب جديد.',
      });
    }
    if (!user.passwordHash || !user.salt) {
      await auditLog({ userId: user.id, action: 'LOGIN_FAILED', req, result: 'failure', details: 'no_credentials' });
      return res.status(401).json({ error: 'unauthorized' });
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      const until = user.lockedUntil.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
      await auditLog({ userId: user.id, action: 'LOGIN_FAILED', req, result: 'failure', details: 'account_locked' });
      return res.status(423).json({
        error: 'account_locked',
        message: `الحساب مقفل حتى ${until}`,
      });
    }

    const isValid = await verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const updates: { failedLoginAttempts: number; lockedUntil?: Date } = { failedLoginAttempts: attempts };
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000);
        updates.lockedUntil = lockedUntil;
        await prisma.user.update({
          where: { id: user.id },
          data: updates,
        });
        await auditLog({
          userId: user.id,
          action: 'ACCOUNT_LOCKED',
          req,
          result: 'failure',
          details: `locked_until_${lockedUntil.toISOString()}`,
        });
        // TODO: إشعار بالإيميل أو الموبايل
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: updates,
        });
      }
      await auditLog({ userId: user.id, action: 'LOGIN_FAILED', req, result: 'failure', details: 'wrong_password' });
      return res.status(401).json({ error: 'unauthorized' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    let restored = false;
    if (user.isDeleted) {
      if (user.deletionScheduledFor && user.deletionScheduledFor < now) {
        await auditLog({ userId: user.id, action: 'LOGIN_FAILED', req, result: 'failure', details: 'account_deleted_after_grace' });
        return res.status(401).json({
          error: 'account_not_found',
          message: 'الحساب ده مش موجود. تقدر تسجّل حساب جديد.',
        });
      }
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletionScheduledFor: null,
        },
      });
      restored = true;
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const tempToken = generate2FATempToken(user.id);
      return res.json({
        requires2FA: true,
        tempToken,
      });
    }

    const loginId = user.email ?? user.phone ?? '';
    const accessToken = generateAccessToken({ id: user.id, email: loginId });
    const refreshToken = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_AGE_MS);

    await prisma.refreshToken.create({
      data: await getRefreshTokenData(req, user.id, refreshHash, expiresAt),
    });

    res.cookie('refreshToken', refreshToken, getCookieOptions());

    await auditLog({ userId: user.id, action: 'LOGIN_SUCCESS', req, result: 'success' });
    const safe = sanitizeUser(user as Record<string, unknown>);
    res.json({
      accessToken,
      ...(restored && { restored: true }),
      user: safe ?? {
        id: user.id,
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
        fullName: user.fullName,
        username: user.username ?? undefined,
        onboardingCompleted: user.onboardingCompleted,
        isFirstLogin: user.isFirstLogin,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Complete login after 2FA: body { tempToken, code }
router.post('/2fa/authenticate', async (req: Request, res: Response) => {
  try {
    const { tempToken, code } = req.body as { tempToken?: string; code?: string };
    if (!tempToken || !code || typeof code !== 'string' || code.length !== 6) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    let userId: string;
    try {
      userId = verify2FATempToken(tempToken).userId;
    } catch {
      return res.status(401).json({ error: 'invalid_or_expired_token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true, fullName: true, username: true, twoFactorSecret: true, onboardingCompleted: true, isFirstLogin: true },
    });

    if (!user?.twoFactorSecret) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!valid) {
      return res.status(401).json({ error: 'invalid_code' });
    }

    const loginId = user.email ?? user.phone ?? '';
    const accessToken = generateAccessToken({ id: user.id, email: loginId });
    const refreshToken = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_AGE_MS);

    const refreshData = await getRefreshTokenData(req, user.id, refreshHash, expiresAt).catch(() => ({
      token: refreshHash,
      userId: user.id,
      expiresAt,
      ...getSessionDevice(req),
      ipAddress: req.ip || null,
    }));

    await prisma.refreshToken.create({
      data: refreshData,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: req.ip || null,
      },
    });

    res.cookie('refreshToken', refreshToken, getCookieOptions());
    await auditLog({ userId: user.id, action: 'LOGIN_SUCCESS', req, result: 'success', details: '2fa_verified' });
    const safe = sanitizeUser(user as Record<string, unknown>);
    res.json({
      accessToken,
      user: safe ?? {
        id: user.id,
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
        fullName: user.fullName,
        username: user.username ?? undefined,
        onboardingCompleted: user.onboardingCompleted,
        isFirstLogin: user.isFirstLogin,
      },
    });
  } catch (error) {
    console.error('2FA authenticate error:', error);
    const message = error instanceof Error ? error.message : 'Verification failed';
    res.status(500).json({ error: 'Verification failed', message });
  }
});

// 2FA Setup (requires Bearer) — generate secret, save to DB, return QR + manual code
router.post('/2fa/setup', async (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const secret = speakeasy.generateSecret({
      name: `EGX Pro (${user.email || userId})`,
      length: 20,
    });
    const base32 = secret.base32 ?? '';
    const otpauthUrl = secret.otpauth_url ?? '';
    const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);
    const manualCode = base32.replace(/(.{4})/g, '$1 ').trim();

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: base32, twoFactorEnabled: false },
    });

    res.json({
      secret: base32,
      qrCodeUrl,
      manualCode,
    });
  } catch (err) {
    console.error('2FA setup error:', err);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// 2FA Verify and enable (requires Bearer) — body { code }
router.post('/2fa/verify', async (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const { code } = req.body as { code?: string };
    if (!code || typeof code !== 'string' || code.length !== 6) {
      return res.status(400).json({ error: 'invalid_code' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });
    if (!user?.twoFactorSecret) return res.status(400).json({ error: 'Setup 2FA first' });

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!valid) {
      return res.status(400).json({ error: 'invalid_code' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorEnabledAt: new Date() },
    });
    await auditLog({ userId, action: 'TWO_FA_ENABLED', req, result: 'success' });

    res.json({ success: true });
  } catch (err) {
    console.error('2FA verify enable error:', err);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// 2FA Disable (requires Bearer) — body { code, password }
router.post('/2fa/disable', async (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const { code, password } = req.body as { code?: string; password?: string };
    if (!code || typeof code !== 'string' || code.length !== 6 || !password) {
      return res.status(400).json({ error: 'code_and_password_required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, salt: true, twoFactorSecret: true },
    });
    if (!user?.passwordHash || !user.salt) return res.status(401).json({ error: 'unauthorized' });
    if (!user.twoFactorSecret) return res.status(400).json({ error: '2FA not enabled' });

    const passwordValid = await verifyPassword(password, user.passwordHash, user.salt);
    if (!passwordValid) {
      return res.status(401).json({ error: 'wrong_password' });
    }

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!valid) {
      return res.status(400).json({ error: 'invalid_code' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorEnabledAt: null },
    });
    await auditLog({ userId, action: 'TWO_FA_DISABLED', req, result: 'success' });

    res.json({ success: true });
  } catch (err) {
    console.error('2FA disable error:', err);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  const clearCookie = () => {
    res.clearCookie('refreshToken', getCookieOptions());
  };
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      clearCookie();
      return res.status(401).json({ error: 'unauthorized' });
    }

    const refreshHash = hashRefreshToken(refreshToken);
    const rt = await prisma.refreshToken.findUnique({
      where: { token: refreshHash },
      include: { user: true },
    });

    const now = new Date();
    if (!rt || rt.isRevoked || rt.expiresAt < now) {
      if (rt?.id) await prisma.refreshToken.updateMany({ where: { id: rt.id }, data: { isRevoked: true } });
      clearCookie();
      return res.status(401).json({ error: 'unauthorized' });
    }

    const loginId = rt.user.email ?? rt.user.phone ?? '';
    const accessToken = generateAccessToken({ id: rt.user.id, email: loginId });
    res.json({ accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    clearCookie();
    res.status(401).json({ error: 'unauthorized' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    let userId: string | null = null;
    if (refreshToken) {
      const refreshHash = hashRefreshToken(refreshToken);
      const rt = await prisma.refreshToken.findUnique({ where: { token: refreshHash }, select: { userId: true } });
      if (rt) userId = rt.userId;
      await prisma.refreshToken.updateMany({ where: { token: refreshHash }, data: { isRevoked: true } });
    }
    if (userId) await auditLog({ userId, action: 'LOGOUT', req, result: 'success' });
    res.clearCookie('refreshToken', getCookieOptions());
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.clearCookie('refreshToken', getCookieOptions());
    res.status(500).json({ error: 'Logout failed' });
  }
});

// إنهاء كل الجلسات (من الإعدادات)
router.post('/logout-all', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      res.clearCookie('refreshToken', getCookieOptions());
      return res.status(200).json({ message: 'Logged out' });
    }
    const refreshHash = hashRefreshToken(refreshToken);
    const rt = await prisma.refreshToken.findUnique({ where: { token: refreshHash }, select: { userId: true } });
    if (rt) {
      await prisma.refreshToken.updateMany({ where: { userId: rt.userId }, data: { isRevoked: true } });
      await auditLog({ userId: rt.userId, action: 'SESSION_REVOKED', req, result: 'success', details: 'all_sessions' });
    }
    res.clearCookie('refreshToken', getCookieOptions());
    res.status(200).json({ message: 'All sessions ended' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.clearCookie('refreshToken', getCookieOptions());
    res.status(500).json({ error: 'Failed to end all sessions' });
  }
});

// الجلسات النشطة (نقرأ الـ cookie لمعرفة المستخدم)
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const refreshHash = hashRefreshToken(refreshToken);
    const current = await prisma.refreshToken.findUnique({
      where: { token: refreshHash },
      select: { id: true, userId: true },
    });
    if (!current) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const list = await prisma.refreshToken.findMany({
      where: {
        userId: current.userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    const currentId = current.id;
    res.json(
      list.map((s) => ({
        id: s.id,
        deviceType: s.deviceType ?? undefined,
        browser: s.browser ?? undefined,
        os: s.os ?? undefined,
        deviceInfo: s.deviceInfo ?? undefined,
        city: s.city ?? undefined,
        country: s.country ?? undefined,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isCurrentSession: s.id === currentId,
      }))
    );
  } catch (error) {
    console.error('Sessions list error:', error);
    res.status(500).json({ error: 'Failed to load sessions' });
  }
});

router.delete('/sessions/:tokenId', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const refreshHash = hashRefreshToken(refreshToken);
    const current = await prisma.refreshToken.findUnique({
      where: { token: refreshHash },
      select: { userId: true },
    });
    if (!current) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const { tokenId } = req.params;
    await prisma.refreshToken.updateMany({
      where: { id: tokenId, userId: current.userId },
      data: { isRevoked: true },
    });
    await auditLog({ userId: current.userId, action: 'SESSION_REVOKED', req, result: 'success', details: tokenId });
    res.status(204).send();
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// Change password for authenticated user
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const accessHeader = req.headers.authorization;
    if (!accessHeader || !accessHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const token = accessHeader.substring(7);
    const { verifyAccessToken } = await import('../../src/lib/auth.ts');
    const decoded = verifyAccessToken(token) as { sub: string };
    const userId = decoded.sub;

    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash || !user.salt) {
      return res.status(400).json({ error: 'Password change not available for this account' });
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash, user.salt);
    if (!valid) {
      return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }

    const pwCheck = validateChangePassword(newPassword, { email: user.email, username: user.username });
    if (!pwCheck.ok) {
      return res.status(400).json({ error: pwCheck.message });
    }

    const { hash, salt } = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hash,
        salt,
        lastPasswordChangeAt: new Date(),
      },
    });

    await auditLog({ userId: user.id, action: 'PASSWORD_CHANGED', req, result: 'success' });
    res.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const refreshHash = hashRefreshToken(refreshToken);
    const rt = await prisma.refreshToken.findUnique({
      where: { token: refreshHash },
      include: { user: true },
    });

    const now = new Date();
    if (!rt || rt.isRevoked || rt.expiresAt < now) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const loginId = rt.user.email ?? rt.user.phone ?? '';
    const accessToken = generateAccessToken({ id: rt.user.id, email: loginId });
    const safe = sanitizeUser(rt.user as Record<string, unknown>);
    res.json({
      accessToken,
      user: safe ?? {
        id: rt.user.id,
        email: rt.user.email ?? undefined,
        phone: rt.user.phone ?? undefined,
        fullName: rt.user.fullName,
        username: rt.user.username ?? undefined,
        onboardingCompleted: rt.user.onboardingCompleted,
        isFirstLogin: rt.user.isFirstLogin,
      },
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
      const referralCode = `EGX-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          fullName: googleUser.name,
          onboardingCompleted: false,
          referralCode,
        },
      });
    } else if (!user.referralCode) {
      const referralCode = `EGX-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      user = await prisma.user.update({
        where: { id: user.id },
        data: { referralCode },
      });
    }

    const refreshToken = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_AGE_MS);
    await prisma.refreshToken.create({
      data: await getRefreshTokenData(req, user.id, refreshHash, expiresAt),
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
