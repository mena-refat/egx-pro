import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { generateAdminToken } from '../../lib/adminAuth.ts';
import { hashPassword, verifyPassword } from '../../../src/lib/auth.ts';
import { adminAudit, type AdminRequest } from '../../middleware/adminAuth.middleware.ts';
import { sendSuccess, sendError } from '../../lib/apiResponse.ts';

export const AdminAuthController = {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as { email?: string; password?: string };
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
        lastLoginAt: true,
        createdAt: true,
      },
    });
    sendSuccess(res, admin);
  },
};

