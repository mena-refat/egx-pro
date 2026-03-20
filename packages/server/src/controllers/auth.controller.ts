import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { verifyAccessToken } from '../lib/auth.ts';
import * as AuthService from '../services/auth.service.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import { getCache, setCache, deleteCache } from '../lib/redis.ts';
import { EmailService } from '../services/email.service.ts';
import type { AuthRequest } from '../routes/types.ts';
import { logger } from '../lib/logger.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';
import { AppError } from '../lib/errors.ts';

const isProduction = process.env.NODE_ENV === 'production';
const REFRESH_TOKEN_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: REFRESH_TOKEN_AGE_MS, // 30 days — must match REFRESH_TOKEN_AGE_MS
});

function authContext(req: Request): AuthService.AuthContext {
  return {
    ip: req.ip ?? undefined,
    userAgent: req.headers['user-agent'] ?? undefined,
    auditReq: req ? { ip: req.ip, headers: req.headers } : undefined,
  };
}

function getAuthUserId(req: Request): number | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = verifyAccessToken(authHeader.slice(7)) as { sub: string };
    const id = parseInt(decoded.sub, 10);
    return isNaN(id) ? null : id;
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
  if (e instanceof AppError) {
    sendError(res, e.code, e.status, e.message);
    return;
  }
  if (e instanceof z.ZodError) {
    const first = e.issues[0];
    const msg = first?.message && typeof first.message === 'string' ? first.message : 'Invalid input';
    sendError(res, 'VALIDATION_ERROR', 400, msg);
    return;
  }
  logger.error('Auth controller error', { error: e });
  sendError(res, 'INTERNAL_ERROR', 500, fallbackMessage);
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const body = { ...req.body, emailOrPhone: req.body?.emailOrPhone ?? req.body?.email };
    const ctx = authContext(req);
    const result = await AuthService.register(body, ctx);
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user }, 201);
  } catch (e) {
    if (e instanceof AppError) {
      sendError(res, e.code, e.status, e.message);
      return;
    }
    if (e instanceof z.ZodError) {
      const first = e.issues[0];
      const msg = first?.message && typeof first.message === 'string' ? first.message : 'Invalid input';
      sendError(res, 'VALIDATION_ERROR', 400, msg);
      return;
    }
    logger.error('Registration error', { error: e });
    const isPrisma = e && typeof e === 'object' && 'code' in e;
    const prismaCode = isPrisma ? (e as { code?: string }).code : undefined;
    const errMessage = e instanceof Error ? e.message : String(e);
    const errLower = errMessage.toLowerCase();
    if (prismaCode === 'P2002' || errLower.includes('unique constraint') || errLower.includes('duplicate key')) {
      sendError(res, 'ALREADY_REGISTERED', 400, 'البريد أو رقم الموبايل أو اسم المستخدم مستخدم بالفعل.');
      return;
    }
    if (prismaCode === 'P2003') {
      sendError(res, 'INVALID_DATA', 400, 'بيانات غير صالحة. تأكد من الحقول وحاول مرة أخرى.');
      return;
    }
    if (errLower.includes('connect') || errLower.includes('econnrefused') || errLower.includes('connection')) {
      sendError(res, 'SERVICE_UNAVAILABLE', 503, 'تعذر الاتصال بقاعدة البيانات. تأكد أن الخادم يعمل وحاول لاحقاً.');
      return;
    }
    sendError(res, 'INTERNAL_ERROR', 500, 'حدث خطأ أثناء التسجيل. حاول مرة أخرى.');
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const body = { ...req.body, emailOrPhone: req.body?.emailOrPhone ?? req.body?.email };
    const ctx = authContext(req);
    const result = await AuthService.login(body, ctx);
    if ('requires2FA' in result && result.requires2FA) {
      sendSuccess(res, { requires2FA: true, tempToken: result.tempToken });
      return;
    }
    const success = result as { refreshToken: string; accessToken: string; user: unknown; restored?: boolean };
    setRefreshCookie(res, success.refreshToken);
    sendSuccess(res, { accessToken: success.accessToken, refreshToken: success.refreshToken, ...(success.restored && { restored: true }), user: success.user });
  } catch (e) {
    handleError(e, res, 'Login failed');
  }
}

export async function twoFaAuthenticate(req: Request, res: Response): Promise<void> {
  try {
    const ctx = authContext(req);
    const result = await AuthService.twoFaAuthenticate(req.body as { tempToken?: string; code?: string }, ctx);
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user });
  } catch (e) {
    if (e instanceof AppError) {
      sendError(res, e.code, e.status, e.message);
      return;
    }
    logger.error('2FA authenticate error', { error: e });
    sendError(res, 'INTERNAL_ERROR', 500, 'حدث خطأ أثناء التحقق. حاول مرة أخرى.');
  }
}

export async function twoFaSetup(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const result = await AuthService.twoFaSetup(userId);
    sendSuccess(res, result);
  } catch (e) {
    handleError(e, res, 'Failed to setup 2FA');
  }
}

export async function twoFaVerify(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    await AuthService.twoFaVerify(userId, req.body as { code?: string }, authContext(req));
    sendSuccess(res, { success: true });
  } catch (e) {
    handleError(e, res, 'Failed to verify 2FA');
  }
}

export async function twoFaDisable(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    await AuthService.twoFaDisable(userId, req.body as { code?: string; password?: string }, authContext(req));
    sendSuccess(res, { success: true });
  } catch (e) {
    handleError(e, res, 'Failed to disable 2FA');
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    // Accept refresh token from cookie (web) or Authorization header (mobile)
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const fromCookie = !!req.cookies?.refreshToken;
    const token = req.cookies?.refreshToken ?? headerToken;
    const ctx = authContext(req);
    const result = await AuthService.refresh(token, { ip: ctx.ip, userAgent: ctx.userAgent });
    // Rotate cookie for web clients; mobile reads the token from the response body
    if (fromCookie) setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, { accessToken: result.accessToken, ...(fromCookie ? {} : { refreshToken: result.refreshToken }) });
  } catch (e) {
    clearRefreshCookie(res);
    if (e instanceof AppError) {
      sendError(res, e.code, e.status, e.message);
      return;
    }
    logger.error('Refresh token error', { error: e });
    sendError(res, 'UNAUTHORIZED', 401);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    await AuthService.logout(token, authContext(req));
    clearRefreshCookie(res);
    sendSuccess(res, { message: 'Logged out successfully' });
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
    sendSuccess(res, { message: 'All sessions ended' });
  } catch (e) {
    clearRefreshCookie(res);
    handleError(e, res, 'Failed to end all sessions');
  }
}

export async function getSessions(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    const list = await AuthService.getSessions(token);
    sendSuccess(res, list);
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
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    await AuthService.changePassword(userId, req.body as { currentPassword?: string; newPassword?: string }, authContext(req));
    sendSuccess(res, { success: true });
  } catch (e) {
    handleError(e, res, 'Failed to change password');
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    // Web flow: use refresh token cookie (issues a new access token)
    const refreshCookie = req.cookies?.refreshToken;
    if (refreshCookie) {
      const result = await AuthService.getMe(refreshCookie);
      sendSuccess(res, { accessToken: result.accessToken, user: result.user });
      return;
    }

    // Mobile flow: validate access token from Authorization header
    const userId = getAuthUserId(req);
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const user = await UserRepository.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, phone: true, fullName: true, username: true,
        avatarUrl: true, plan: true, planExpiresAt: true, language: true,
        theme: true, shariaMode: true, onboardingCompleted: true,
        isFirstLogin: true, aiAnalysisUsedThisMonth: true,
        isEmailVerified: true, twoFactorEnabled: true,
        riskTolerance: true, investmentHorizon: true, monthlyBudget: true,
        interestedSectors: true, notifySignals: true, notifyPortfolio: true,
        notifyNews: true, notifyAchievements: true, notifyGoals: true,
        loginStreak: true, userTitle: true, isDeleted: true, isSuspended: true,
      },
    });
    if (!user || (user as { isDeleted?: boolean }).isDeleted) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    if ((user as { isSuspended?: boolean }).isSuspended) {
      sendError(res, 'ACCOUNT_SUSPENDED', 403, 'هذا الحساب محظور');
      return;
    }
    sendSuccess(res, { user });
  } catch (e) {
    handleError(e, res, 'Auth check failed');
  }
}

export async function getGoogleUrl(_req: Request, res: Response): Promise<void> {
  const { url, state } = await AuthService.getGoogleUrl();
  sendSuccess(res, { url, state });
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  if (!code) {
    res.status(400).send('No code provided');
    return;
  }
  try {
    const ctx = authContext(req);
    const result = await AuthService.googleCallback(code, state ?? '', ctx);
    setRefreshCookie(res, result.refreshToken);
    res.send(result.redirectHtml);
  } catch (e) {
    logger.error('Google OAuth error', { error: e });
    res.status(500).send('Authentication failed');
  }
}

export async function sendVerifyEmail(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId ?? req.user?.id;
  if (!userId) {
    sendError(res, 'UNAUTHORIZED', 401);
    return;
  }
  try {
    // Rate limit: max 3 sends per user per hour
    const rateLimitKey = `email_verify_send_limit:${userId}`;
    const sends = parseInt((await getCache<string>(rateLimitKey)) ?? '0', 10);
    if (sends >= 3) {
      sendError(res, 'RATE_LIMIT_EXCEEDED', 429, 'تجاوزت الحد المسموح. انتظر ساعة وحاول مجدداً.');
      return;
    }

    const user = await UserRepository.findUnique({
      where: { id: userId },
      select: { email: true, isEmailVerified: true },
    });
    if (!user?.email) {
      sendError(res, 'NO_EMAIL', 400);
      return;
    }
    if (user.isEmailVerified) {
      sendError(res, 'ALREADY_VERIFIED', 400);
      return;
    }
    // Cryptographically secure 6-digit code
    const code = crypto.randomInt(100000, 1000000).toString();
    await setCache(`email_verify:${userId}`, code, 15 * 60);
    await setCache(rateLimitKey, String(sends + 1), 60 * 60);
    await EmailService.sendVerificationCode(user.email, code);
    sendSuccess(res, { success: true });
  } catch (e) {
    logger.error('sendVerifyEmail error', { error: e });
    sendError(res, 'SERVER_ERROR', 500);
  }
}

export async function confirmVerifyEmail(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId ?? req.user?.id;
  if (!userId) {
    sendError(res, 'UNAUTHORIZED', 401);
    return;
  }
  const { code } = (req.body as { code?: string }) ?? {};
  if (!code || typeof code !== 'string') {
    sendError(res, 'CODE_REQUIRED', 400);
    return;
  }
  try {
    // Attempt limit: max 5 wrong tries per code window
    const attemptsKey = `email_verify_attempts:${userId}`;
    const attempts = parseInt((await getCache<string>(attemptsKey)) ?? '0', 10);
    if (attempts >= 5) {
      sendError(res, 'TOO_MANY_ATTEMPTS', 429, 'تجاوزت عدد المحاولات المسموحة. اطلب كود جديد.');
      return;
    }

    const stored = await getCache<string>(`email_verify:${userId}`);
    if (!stored || stored !== code.trim()) {
      await setCache(attemptsKey, String(attempts + 1), 15 * 60);
      sendError(res, 'INVALID_CODE', 400);
      return;
    }
    // Invalidate code immediately after successful use
    await deleteCache(`email_verify:${userId}`);
    await deleteCache(attemptsKey);
    await UserRepository.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });
    sendSuccess(res, { success: true });
  } catch (e) {
    logger.error('confirmVerifyEmail error', { error: e });
    sendError(res, 'SERVER_ERROR', 500);
  }
}
