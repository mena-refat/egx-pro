import type { Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { sendSuccess, sendError } from '../../lib/apiResponse.ts';
import { adminAudit, type AdminRequest } from '../../middleware/adminAuth.middleware.ts';
import { hashPassword } from '../../../src/lib/auth.ts';

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
    const { email, password, fullName, permissions = [] } = req.body as {
      email?: string;
      password?: string;
      fullName?: string;
      permissions?: string[];
    };
    if (!email?.trim() || !password || !fullName?.trim()) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }
    if (password.length < 12) {
      sendError(res, 'PASSWORD_TOO_WEAK', 400);
      return;
    }

    const existing = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      sendError(res, 'EMAIL_ALREADY_EXISTS', 409);
      return;
    }

    const { hash, salt } = await hashPassword(password);
    const admin = await prisma.admin.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash: hash,
        salt,
        fullName,
        permissions,
        createdBy: req.admin?.id ?? null,
      },
    });

    if (req.admin) {
      await adminAudit(
        req.admin.id,
        'ADMIN_CREATED',
        admin.id,
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

  async updatePermissions(req: AdminRequest, res: Response): Promise<void> {
    if (req.admin?.role !== 'SUPER_ADMIN') {
      sendError(res, 'ADMIN_FORBIDDEN', 403);
      return;
    }
    const { id } = req.params as { id: string };
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
        id,
        JSON.stringify({ permissions, isActive }),
        req
      );
    }

    sendSuccess(res, { ok: true });
  },
};

