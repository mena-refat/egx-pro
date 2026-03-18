import type { Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { sendSuccess, sendError } from '../../lib/apiResponse.ts';
import { adminAudit, type AdminRequest } from '../../middleware/adminAuth.middleware.ts';

export const AdminDiscountsController = {
  async list(_req: AdminRequest, res: Response): Promise<void> {
    const discounts = await prisma.discountCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { discountUsages: true } },
      },
    });
    sendSuccess(res, discounts);
  },

  async create(req: AdminRequest, res: Response): Promise<void> {
    const { code, type, value, expiresAt, maxUses } = req.body as {
      code?: string;
      type?: string;
      value?: number;
      expiresAt?: string;
      maxUses?: number;
    };
    if (!code?.trim() || !type || value == null) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }

    const existing = await prisma.discountCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (existing) {
      sendError(res, 'CODE_ALREADY_EXISTS', 409);
      return;
    }

    const discount = await prisma.discountCode.create({
      data: {
        code: code.trim().toUpperCase(),
        type,
        value,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses ?? null,
      },
    });
    if (req.admin) {
      await adminAudit(
        req.admin.id,
        'DISCOUNT_CREATED',
        discount.id,
        `code: ${discount.code}`,
        req
      );
    }
    sendSuccess(res, discount, 201);
  },

  async update(req: AdminRequest, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const { active, expiresAt, maxUses, value } = req.body as {
      active?: boolean;
      expiresAt?: string;
      maxUses?: number;
      value?: number;
    };

    const discount = await prisma.discountCode.update({
      where: { id },
      data: {
        ...(active != null && { active }),
        ...(expiresAt !== undefined && {
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        }),
        ...(maxUses !== undefined && { maxUses }),
        ...(value !== undefined && { value }),
      },
    });
    if (req.admin) {
      await adminAudit(
        req.admin.id,
        'DISCOUNT_UPDATED',
        id,
        JSON.stringify(req.body),
        req
      );
    }
    sendSuccess(res, discount);
  },

  async remove(req: AdminRequest, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    await prisma.discountCode.delete({ where: { id } });
    if (req.admin) {
      await adminAudit(req.admin.id, 'DISCOUNT_DELETED', id, undefined, req);
    }
    sendSuccess(res, { ok: true });
  },
};

