import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';
import { sendSuccess, sendError } from '../../lib/apiResponse.ts';
import { adminAudit, type AdminRequest } from '../../middleware/adminAuth.middleware.ts';
import { hashPassword, verifyPassword } from '../../lib/auth.ts';

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
      where: { isDeleted: false },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        role: true,
        permissions: true,
        isActive: true,
        managerId: true,
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
    const { email, phone, password, fullName, permissions = [], role, options = {}, confirmPassword, managerId } = req.body as {
      email?: string;
      phone?: string;
      password?: string;
      fullName?: string;
      permissions?: string[];
      role?: 'SUPER_ADMIN' | 'ADMIN';
      confirmPassword?: string;
      managerId?: number | null;
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

    const { hash, salt } = await hashPassword(password);

    let admin;
    try {
      admin = await prisma.admin.create({
        data: {
          email: normalizedEmail,
          phone: normalizedPhone,
          passwordHash: hash,
          salt,
          fullName,
          permissions,
          createdBy: req.admin?.id ?? null,
          role: role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN',
          managerId: managerId ?? null,
          mustChangePassword,
          mustSetup2FA,
          pwdMinLength,
          pwdUppercase,
          pwdLowercase,
          pwdSymbols,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const field = (err.meta?.target as string[] | undefined)?.[0];
        sendError(res, field === 'phone' ? 'PHONE_ALREADY_EXISTS' : 'EMAIL_ALREADY_EXISTS', 409);
        return;
      }
      throw err;
    }

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
      select: { role: true, isDeleted: true },
    });
    if (!target || target.isDeleted) {
      sendError(res, 'NOT_FOUND', 404);
      return;
    }

    // Soft-delete: preserve audit logs and all related data
    await prisma.admin.update({
      where: { id },
      data: {
        isActive: false,
        isDeleted: true,
        deletedAt: new Date(),
        // Invalidate tokens
        tokenVersion: { increment: 1 },
      },
    });

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
      // tokenVersion increment invalidates all existing JWTs for this admin
      data: { passwordHash: hash, salt, mustChangePassword: true, tokenVersion: { increment: 1 } },
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
      // tokenVersion increment invalidates all existing JWTs for this admin
      data: { twoFactorEnabled: false, twoFactorSecret: null, mustSetup2FA: true, tokenVersion: { increment: 1 } },
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

    // Prevent super admin from editing their own permissions via this endpoint
    if (id === req.admin.id) {
      sendError(res, 'USE_ACCOUNT_PAGE', 400);
      return;
    }

    const { permissions, isActive, managerId } = req.body as {
      permissions?: string[];
      isActive?: boolean;
      managerId?: number | null;
    };

    const target = await prisma.admin.findUnique({
      where: { id },
      select: { role: true, isDeleted: true },
    });
    if (!target || target.isDeleted) {
      sendError(res, 'NOT_FOUND', 404);
      return;
    }
    if (target.role === 'SUPER_ADMIN') {
      sendError(res, 'CANNOT_MODIFY_SUPER_ADMIN', 403);
      return;
    }

    // Validate managerId references a real, active, non-deleted admin
    if (managerId != null) {
      const manager = await prisma.admin.findUnique({
        where: { id: managerId },
        select: { id: true, isActive: true, isDeleted: true },
      });
      if (!manager || !manager.isActive || manager.isDeleted) {
        sendError(res, 'MANAGER_NOT_FOUND', 404);
        return;
      }
    }

    await prisma.admin.update({
      where: { id },
      data: {
        ...(permissions && { permissions }),
        ...(isActive != null && { isActive }),
        ...(managerId !== undefined && { managerId }),
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
