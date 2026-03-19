import type { Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { sendSuccess, sendError } from '../../lib/apiResponse.ts';
import { adminAudit, type AdminRequest } from '../../middleware/adminAuth.middleware.ts';
import { hashPassword, verifyPassword } from '../../../src/lib/auth.ts';

async function verifySuperAdminPassword(req: AdminRequest, confirmPassword?: string): Promise<boolean> {
  if (!confirmPassword || !req.admin) return false;
  const me = await prisma.admin.findUnique({
    where: { id: req.admin.id },
    select: { passwordHash: true, salt: true },
  });
  if (!me) return false;
  return verifyPassword(confirmPassword, me.passwordHash, me.salt);
}

export const AdminAdminsController = {
  async list(req: AdminRequest, res: Response): Promise<void> {
    if (req.admin?.role !== 'SUPER_ADMIN') {
      sendError(res, 'ADMIN_FORBIDDEN', 403);
      return;
    }
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    sendSuccess(res, admins);
  },

  async create(req: AdminRequest, res: Response): Promise<void> {
    if (req.admin?.role !== 'SUPER_ADMIN') {
      sendError(res, 'ADMIN_FORBIDDEN', 403);
      return;
    }
    const { email, phone, password, fullName, permissions = [], role, options = {}, confirmPassword } = req.body as {
      email?: string;
      phone?: string;
      password?: string;
      fullName?: string;
      permissions?: string[];
      role?: 'SUPER_ADMIN' | 'ADMIN';
      confirmPassword?: string;
      options?: {
        mustChangePassword?: boolean;
        mustSetup2FA?: boolean;
        pwdMinLength?: boolean;
        pwdUppercase?: boolean;
        pwdLowercase?: boolean;
        pwdSymbols?: boolean;
      };
    };
    if (!email?.trim() || !password || !fullName?.trim()) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }
    if (password.length < 12) {
      sendError(res, 'PASSWORD_TOO_WEAK', 400);
      return;
    }
    if (!await verifySuperAdminPassword(req, confirmPassword)) {
      sendError(res, 'INVALID_CREDENTIALS', 401);
      return;
    }

    const mustChangePassword = options.mustChangePassword ?? true;
    const mustSetup2FA       = options.mustSetup2FA       ?? true;
    const pwdMinLength       = options.pwdMinLength       ?? true;
    const pwdUppercase       = options.pwdUppercase       ?? true;
    const pwdLowercase       = options.pwdLowercase       ?? true;
    const pwdSymbols         = options.pwdSymbols         ?? true;

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone?.trim() || undefined;

    const existingEmail = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
    if (existingEmail) { sendError(res, 'EMAIL_ALREADY_EXISTS', 409); return; }

    if (normalizedPhone) {
      const existingPhone = await prisma.admin.findUnique({ where: { phone: normalizedPhone } });
      if (existingPhone) { sendError(res, 'PHONE_ALREADY_EXISTS', 409); return; }
    }

    const { hash, salt } = await hashPassword(password);
    const admin = await prisma.admin.create({
      data: {
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash: hash,
        salt,
        fullName,
        permissions,
        createdBy: req.admin?.id ?? null,
        role: role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN',
        mustChangePassword,
        mustSetup2FA,
        pwdMinLength,
        pwdUppercase,
        pwdLowercase,
        pwdSymbols,
      },
    });

    if (req.admin) {
      await adminAudit(
        req.admin.id,
        'ADMIN_CREATED',
        admin.id.toString(),
        `email: ${admin.email}`,
        req
      );
    }

    sendSuccess(res, {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
    });
  },

  async deleteAdmin(req: AdminRequest, res: Response): Promise<void> {
    if (req.admin?.role !== 'SUPER_ADMIN') {
      sendError(res, 'ADMIN_FORBIDDEN', 403);
      return;
    }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { sendError(res, 'VALIDATION_ERROR', 400); return; }
    const { confirmPassword } = req.body as { confirmPassword?: string };

    if (!await verifySuperAdminPassword(req, confirmPassword)) {
      sendError(res, 'INVALID_CREDENTIALS', 401);
      return;
    }
    if (id === req.admin.id) {
      sendError(res, 'CANNOT_DELETE_SELF', 400);
      return;
    }
    const target = await prisma.admin.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!target) {
      sendError(res, 'NOT_FOUND', 404);
      return;
    }
    await prisma.$transaction([
      prisma.adminAuditLog.deleteMany({ where: { adminId: id } }),
      prisma.admin.delete({ where: { id } }),
    ]);
    if (req.admin) {
      await adminAudit(req.admin.id, 'ADMIN_DELETED', id.toString(), undefined, req);
    }
    sendSuccess(res, { ok: true });
  },

  async updateAdminProfile(req: AdminRequest, res: Response): Promise<void> {
    if (req.admin?.role !== 'SUPER_ADMIN') { sendError(res, 'ADMIN_FORBIDDEN', 403); return; }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { sendError(res, 'VALIDATION_ERROR', 400); return; }
    if (id === req.admin.id) { sendError(res, 'USE_ACCOUNT_PAGE', 400); return; }
    const { fullName, email } = req.body as { fullName?: string; email?: string };
    if (!fullName?.trim() && !email?.trim()) { sendError(res, 'VALIDATION_ERROR', 400); return; }

    const data: Record<string, unknown> = {};
    if (fullName?.trim()) data.fullName = fullName.trim();
    if (email?.trim()) {
      const norm = email.toLowerCase().trim();
      const dup = await prisma.admin.findFirst({ where: { email: norm, NOT: { id } } });
      if (dup) { sendError(res, 'EMAIL_ALREADY_EXISTS', 409); return; }
      data.email = norm;
    }

    const updated = await prisma.admin.update({ where: { id }, data, select: { id: true, email: true, fullName: true } });
    if (req.admin) await adminAudit(req.admin.id, 'ADMIN_PROFILE_UPDATED', id.toString(), JSON.stringify(data), req);
    sendSuccess(res, updated);
  },

  async resetAdminPassword(req: AdminRequest, res: Response): Promise<void> {
    if (req.admin?.role !== 'SUPER_ADMIN') { sendError(res, 'ADMIN_FORBIDDEN', 403); return; }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { sendError(res, 'VALIDATION_ERROR', 400); return; }
    if (id === req.admin.id) { sendError(res, 'USE_ACCOUNT_PAGE', 400); return; }
    const { newPassword, confirmPassword } = req.body as { newPassword?: string; confirmPassword?: string };
    if (!newPassword || newPassword.length < 12) { sendError(res, 'PASSWORD_TOO_WEAK', 400); return; }
    if (!await verifySuperAdminPassword(req, confirmPassword)) { sendError(res, 'INVALID_CREDENTIALS', 401); return; }

    const { hash, salt } = await hashPassword(newPassword);
    await prisma.admin.update({
      where: { id },
      data: { passwordHash: hash, salt, mustChangePassword: true },
    });
    if (req.admin) await adminAudit(req.admin.id, 'ADMIN_RESET_PASSWORD', id.toString(), undefined, req);
    sendSuccess(res, { ok: true });
  },

  async resetAdmin2FA(req: AdminRequest, res: Response): Promise<void> {
    if (req.admin?.role !== 'SUPER_ADMIN') { sendError(res, 'ADMIN_FORBIDDEN', 403); return; }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { sendError(res, 'VALIDATION_ERROR', 400); return; }
    if (id === req.admin.id) { sendError(res, 'USE_ACCOUNT_PAGE', 400); return; }
    const { confirmPassword } = req.body as { confirmPassword?: string };
    if (!await verifySuperAdminPassword(req, confirmPassword)) { sendError(res, 'INVALID_CREDENTIALS', 401); return; }

    await prisma.admin.update({
      where: { id },
      data: { twoFactorEnabled: false, twoFactorSecret: null, mustSetup2FA: true },
    });
    if (req.admin) await adminAudit(req.admin.id, 'ADMIN_RESET_2FA', id.toString(), undefined, req);
    sendSuccess(res, { ok: true });
  },

  async updatePermissions(req: AdminRequest, res: Response): Promise<void> {
    if (req.admin?.role !== 'SUPER_ADMIN') {
      sendError(res, 'ADMIN_FORBIDDEN', 403);
      return;
    }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { sendError(res, 'VALIDATION_ERROR', 400); return; }
    const { permissions, isActive } = req.body as {
      permissions?: string[];
      isActive?: boolean;
    };

    const target = await prisma.admin.findUnique({
      where: { id },
      select: { role: true },
    });
    if (target?.role === 'SUPER_ADMIN') {
      sendError(res, 'CANNOT_MODIFY_SUPER_ADMIN', 403);
      return;
    }

    await prisma.admin.update({
      where: { id },
      data: {
        ...(permissions && { permissions }),
        ...(isActive != null && { isActive }),
      },
    });

    if (req.admin) {
      await adminAudit(
        req.admin.id,
        'ADMIN_PERMISSIONS_UPDATED',
        id.toString(),
        JSON.stringify({ permissions, isActive }),
        req
      );
    }

    sendSuccess(res, { ok: true });
  },
};

