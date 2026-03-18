import type { Request, Response } from 'express';
import speakeasy from 'speakeasy';
import { prisma } from '../../lib/prisma.ts';

function validatePassword(
  pw: string,
  rules: { pwdMinLength: boolean; pwdUppercase: boolean; pwdLowercase: boolean; pwdSymbols: boolean },
): string | null {
  if (rules.pwdMinLength && (pw.length < 18 || pw.length > 64)) return 'PASSWORD_TOO_SHORT';
  if (rules.pwdUppercase && !/[A-Z]/.test(pw)) return 'PASSWORD_MISSING_UPPERCASE';
  if (rules.pwdLowercase && !/[a-z]/.test(pw)) return 'PASSWORD_MISSING_LOWERCASE';
  if (rules.pwdSymbols  && !/[^A-Za-z0-9]/.test(pw)) return 'PASSWORD_MISSING_SYMBOL';
  return null;
}
import { generateAdminToken } from '../../lib/adminAuth.ts';
import { hashPassword, verifyPassword } from '../../../src/lib/auth.ts';
import { adminAudit, type AdminRequest } from '../../middleware/adminAuth.middleware.ts';
import { sendSuccess, sendError } from '../../lib/apiResponse.ts';

export const AdminAuthController = {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password, code } = req.body as {
      email?: string;
      password?: string;
      code?: string;
    };
    if (!email?.trim() || !password) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }

    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!admin || !admin.isActive) {
      sendError(res, 'INVALID_CREDENTIALS', 401);
      return;
    }

    const valid = await verifyPassword(password, admin.passwordHash, admin.salt);
    if (!valid) {
      sendError(res, 'INVALID_CREDENTIALS', 401);
      return;
    }

    if (admin.twoFactorEnabled) {
      if (!code) {
        sendError(res, 'ADMIN_2FA_REQUIRED', 401);
        return;
      }
      const ok = speakeasy.totp.verify({
        secret: admin.twoFactorSecret ?? '',
        encoding: 'base32',
        token: code,
        window: 1,
      });
      if (!ok) {
        sendError(res, 'INVALID_CREDENTIALS', 401);
        return;
      }
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date(), lastLoginIp: req.ip ?? null },
    });

    const token = generateAdminToken({
      id: admin.id,
      role: admin.role,
      permissions: admin.permissions,
    });

    await adminAudit(admin.id, 'ADMIN_LOGIN', undefined, undefined, req);

    sendSuccess(res, {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        permissions: admin.permissions,
        mustChangePassword: admin.mustChangePassword,
        mustSetup2FA: admin.mustSetup2FA && !admin.twoFactorEnabled,
      },
    });
  },

  async me(req: AdminRequest, res: Response): Promise<void> {
    if (!req.admin) {
      sendError(res, 'ADMIN_UNAUTHORIZED', 401);
      return;
    }
    const admin = await prisma.admin.findUnique({
      where: { id: req.admin.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        permissions: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    sendSuccess(res, admin);
  },

  async changePassword(req: AdminRequest, res: Response): Promise<void> {
    if (!req.admin) {
      sendError(res, 'ADMIN_UNAUTHORIZED', 401);
      return;
    }
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword || newPassword.length < 12) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }

    const existing = await prisma.admin.findUnique({
      where: { id: req.admin.id },
    });
    if (!existing) {
      sendError(res, 'ADMIN_UNAUTHORIZED', 401);
      return;
    }
    const valid = await verifyPassword(
      currentPassword,
      existing.passwordHash,
      existing.salt,
    );
    if (!valid) {
      sendError(res, 'INVALID_CREDENTIALS', 401);
      return;
    }

    const pwdError = validatePassword(newPassword, existing);
    if (pwdError) {
      sendError(res, pwdError, 400);
      return;
    }

    const { hash, salt } = await hashPassword(newPassword);
    await prisma.admin.update({
      where: { id: existing.id },
      data: {
        passwordHash: hash,
        salt,
        mustChangePassword: false,
      },
    });

    await adminAudit(existing.id, 'ADMIN_PASSWORD_CHANGED', existing.id, undefined, req);
    sendSuccess(res, { success: true });
  },

  async updateProfile(req: AdminRequest, res: Response): Promise<void> {
    if (!req.admin) {
      sendError(res, 'ADMIN_UNAUTHORIZED', 401);
      return;
    }
    if (req.admin.role !== 'SUPER_ADMIN') {
      sendError(res, 'ADMIN_FORBIDDEN', 403);
      return;
    }
    const { fullName, email } = req.body as {
      fullName?: string;
      email?: string;
    };
    if (!fullName?.trim() && !email?.trim()) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }
    const data: Record<string, unknown> = {};
    if (fullName?.trim()) data.fullName = fullName.trim();
    if (email?.trim()) data.email = email.toLowerCase().trim();

    if (Object.keys(data).length === 0) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }

    const updated = await prisma.admin.update({
      where: { id: req.admin.id },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        permissions: true,
        twoFactorEnabled: true,
      },
    });

    await adminAudit(
      req.admin.id,
      'ADMIN_PROFILE_UPDATED',
      req.admin.id,
      JSON.stringify(data),
      req,
    );
    sendSuccess(res, updated);
  },

  async twoFaSetup(req: AdminRequest, res: Response): Promise<void> {
    if (!req.admin) {
      sendError(res, 'ADMIN_UNAUTHORIZED', 401);
      return;
    }
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `Borsa Admin (${req.admin.email})`,
    });
    sendSuccess(res, {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
    });
  },

  async twoFaEnable(req: AdminRequest, res: Response): Promise<void> {
    if (!req.admin) {
      sendError(res, 'ADMIN_UNAUTHORIZED', 401);
      return;
    }
    const { secret, code } = req.body as { secret?: string; code?: string };
    if (!secret || !code) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }
    const ok = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!ok) {
      sendError(res, 'INVALID_CREDENTIALS', 400);
      return;
    }
    await prisma.admin.update({
      where: { id: req.admin.id },
      data: { twoFactorEnabled: true, twoFactorSecret: secret },
    });
    await adminAudit(req.admin.id, 'ADMIN_2FA_ENABLED', req.admin.id, undefined, req);
    sendSuccess(res, { success: true });
  },

  async twoFaDisable(req: AdminRequest, res: Response): Promise<void> {
    if (!req.admin) {
      sendError(res, 'ADMIN_UNAUTHORIZED', 401);
      return;
    }
    const { password } = req.body as { password?: string };
    if (!password) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }
    const existing = await prisma.admin.findUnique({
      where: { id: req.admin.id },
    });
    if (!existing) {
      sendError(res, 'ADMIN_UNAUTHORIZED', 401);
      return;
    }
    const valid = await verifyPassword(password, existing.passwordHash, existing.salt);
    if (!valid) {
      sendError(res, 'INVALID_CREDENTIALS', 401);
      return;
    }
    if (existing.mustSetup2FA) {
      sendError(res, '2FA_ENFORCED', 403);
      return;
    }
    await prisma.admin.update({
      where: { id: existing.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    await adminAudit(req.admin.id, 'ADMIN_2FA_DISABLED', req.admin.id, undefined, req);
    sendSuccess(res, { success: true });
  },
};

