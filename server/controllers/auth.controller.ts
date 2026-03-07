import { Request, Response } from 'express';
import { z } from 'zod';
import { verifyAccessToken } from '../../src/lib/auth.ts';
import * as AuthService from '../services/auth.service.ts';

const isProduction = process.env.NODE_ENV === 'production';
const REFRESH_TOKEN_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict' as const,
  maxAge: REFRESH_TOKEN_AGE_MS,
});

function authContext(req: Request): AuthService.AuthContext {
  return {
    ip: req.ip ?? undefined,
    userAgent: req.headers['user-agent'] ?? undefined,
    auditReq: req ? { ip: req.ip, headers: req.headers } : undefined,
  };
}

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

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie('refreshToken', refreshToken, getCookieOptions());
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie('refreshToken', getCookieOptions());
}

function handleError(e: unknown, res: Response, fallbackMessage = 'Request failed'): void {
  if (AuthService.isAuthServiceError(e)) {
    res.status(e.status).json({ error: e.error, ...(e.message && { message: e.message }) });
    return;
  }
  if (e instanceof z.ZodError) {
    const first = e.issues[0];
    const msg = first?.message && typeof first.message === 'string' ? first.message : 'Invalid input';
    res.status(400).json({ error: msg });
    return;
  }
  console.error('Auth controller error:', e);
  res.status(500).json({ error: fallbackMessage });
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const body = { ...req.body, emailOrPhone: req.body?.emailOrPhone ?? req.body?.email };
    const ctx = authContext(req);
    const result = await AuthService.register(body, ctx);
    setRefreshCookie(res, result.refreshToken);
    res.status(201).json({ accessToken: result.accessToken, user: result.user });
  } catch (e) {
    if (AuthService.isAuthServiceError(e)) {
      res.status(e.status).json({ error: e.error, ...(e.message && { message: e.message }) });
      return;
    }
    if (e instanceof z.ZodError) {
      const first = e.issues[0];
      const msg = first?.message && typeof first.message === 'string' ? first.message : 'Invalid input';
      res.status(400).json({ error: msg });
      return;
    }
    console.error('Registration error:', e);
    const isPrisma = e && typeof e === 'object' && 'code' in e;
    const prismaCode = isPrisma ? (e as { code?: string }).code : undefined;
    const errMessage = e instanceof Error ? e.message : String(e);
    const errLower = errMessage.toLowerCase();
    if (prismaCode === 'P2002' || errLower.includes('unique constraint') || errLower.includes('duplicate key')) {
      res.status(400).json({ error: 'already_registered', message: 'البريد أو رقم الموبايل أو اسم المستخدم مستخدم بالفعل.' });
      return;
    }
    if (prismaCode === 'P2003') {
      res.status(400).json({ error: 'invalid_data', message: 'بيانات غير صالحة. تأكد من الحقول وحاول مرة أخرى.' });
      return;
    }
    if (errLower.includes('connect') || errLower.includes('econnrefused') || errLower.includes('connection')) {
      res.status(503).json({ error: 'service_unavailable', message: 'تعذر الاتصال بقاعدة البيانات. تأكد أن الخادم يعمل وحاول لاحقاً.' });
      return;
    }
    res.status(500).json({
      error: 'Registration failed',
      message: errMessage.length <= 120 ? errMessage : errMessage.slice(0, 117) + '...',
    });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const body = { ...req.body, emailOrPhone: req.body?.emailOrPhone ?? req.body?.email };
    const ctx = authContext(req);
    const result = await AuthService.login(body, ctx);
    if ('requires2FA' in result && result.requires2FA) {
      res.json({ requires2FA: true, tempToken: result.tempToken });
      return;
    }
    setRefreshCookie(res, result.refreshToken);
    res.json({
      accessToken: result.accessToken,
      ...(result.restored && { restored: true }),
      user: result.user,
    });
  } catch (e) {
    handleError(e, res, 'Login failed');
  }
}

export async function twoFaAuthenticate(req: Request, res: Response): Promise<void> {
  try {
    const ctx = authContext(req);
    const result = await AuthService.twoFaAuthenticate(req.body as { tempToken?: string; code?: string }, ctx);
    setRefreshCookie(res, result.refreshToken);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (e) {
    if (AuthService.isAuthServiceError(e)) {
      res.status(e.status).json({ error: e.error, ...(e.message && { message: e.message }) });
      return;
    }
    console.error('2FA authenticate error:', e);
    res.status(500).json({ error: 'Verification failed', message: e instanceof Error ? e.message : 'Verification failed' });
  }
}

export async function twoFaSetup(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const result = await AuthService.twoFaSetup(userId);
    res.json(result);
  } catch (e) {
    handleError(e, res, 'Failed to setup 2FA');
  }
}

export async function twoFaVerify(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    await AuthService.twoFaVerify(userId, req.body as { code?: string }, authContext(req));
    res.json({ success: true });
  } catch (e) {
    handleError(e, res, 'Failed to verify 2FA');
  }
}

export async function twoFaDisable(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    await AuthService.twoFaDisable(userId, req.body as { code?: string; password?: string }, authContext(req));
    res.json({ success: true });
  } catch (e) {
    handleError(e, res, 'Failed to disable 2FA');
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    const result = await AuthService.refresh(token);
    res.json({ accessToken: result.accessToken });
  } catch (e) {
    clearRefreshCookie(res);
    if (AuthService.isAuthServiceError(e)) {
      res.status(e.status).json({ error: e.error });
      return;
    }
    console.error('Refresh token error:', e);
    res.status(401).json({ error: 'unauthorized' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    await AuthService.logout(token, authContext(req));
    clearRefreshCookie(res);
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (e) {
    clearRefreshCookie(res);
    handleError(e, res, 'Logout failed');
  }
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    await AuthService.logoutAll(token, authContext(req));
    clearRefreshCookie(res);
    res.status(200).json({ message: 'All sessions ended' });
  } catch (e) {
    clearRefreshCookie(res);
    handleError(e, res, 'Failed to end all sessions');
  }
}

export async function getSessions(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    const list = await AuthService.getSessions(token);
    res.json(list);
  } catch (e) {
    handleError(e, res, 'Failed to load sessions');
  }
}

export async function revokeSession(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    const { tokenId } = req.params;
    await AuthService.revokeSession(token, tokenId, authContext(req));
    res.status(204).send();
  } catch (e) {
    handleError(e, res, 'Failed to revoke session');
  }
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    await AuthService.changePassword(userId, req.body as { currentPassword?: string; newPassword?: string }, authContext(req));
    res.json({ success: true });
  } catch (e) {
    handleError(e, res, 'Failed to change password');
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    const result = await AuthService.getMe(token);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (e) {
    handleError(e, res, 'Auth check failed');
  }
}

export function getGoogleUrl(_req: Request, res: Response): void {
  const { url } = AuthService.getGoogleUrl();
  res.json({ url });
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const code = req.query.code as string;
  if (!code) {
    res.status(400).send('No code provided');
    return;
  }
  try {
    const ctx = authContext(req);
    const result = await AuthService.googleCallback(code, ctx);
    setRefreshCookie(res, result.refreshToken);
    res.send(result.redirectHtml);
  } catch (e) {
    console.error('Google OAuth error', e);
    res.status(500).send('Authentication failed');
  }
}
