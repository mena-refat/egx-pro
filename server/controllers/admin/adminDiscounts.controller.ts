import type { Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { sendSuccess, sendError } from '../../lib/apiResponse.ts';
import { adminAudit, type AdminRequest } from '../../middleware/adminAuth.middleware.ts';

const VALID_DISCOUNT_TYPES = ['percentage', 'fixed', 'full'] as const;
type DiscountType = (typeof VALID_DISCOUNT_TYPES)[number];
const CODE_REGEX = /^[A-Z0-9_-]{2,32}$/;

function validateDiscountValue(type: DiscountType, value: number): string | null {
  if (type === 'percentage' && (value <= 0 || value > 100)) return 'INVALID_DISCOUNT_VALUE';
  if (type === 'fixed' && value <= 0) return 'INVALID_DISCOUNT_VALUE';
  if (type === 'full' && value !== 0) return 'INVALID_DISCOUNT_VALUE';
  return null;
}

export const AdminDiscountsController = {
  async list(req: AdminRequest, res: Response): Promise<void> {
    const { page = '1' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);

    const [discounts, total] = await Promise.all([
      prisma.discountCode.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { usages: true } } },
        skip: (pageNum - 1) * 50,
        take: 50,
      }),
      prisma.discountCode.count(),
    ]);
    sendSuccess(res, { discounts, total, page: pageNum, totalPages: Math.ceil(total / 50) });
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

    const normalizedCode = code.trim().toUpperCase();
    if (!CODE_REGEX.test(normalizedCode)) {
      sendError(res, 'INVALID_CODE_FORMAT', 400);
      return;
    }
    if (!(VALID_DISCOUNT_TYPES as readonly string[]).includes(type)) {
      sendError(res, 'INVALID_DISCOUNT_TYPE', 400);
      return;
    }
    const valueError = validateDiscountValue(type as DiscountType, value);
    if (valueError) { sendError(res, valueError, 400); return; }

    if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1)) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }

    const existing = await prisma.discountCode.findUnique({
      where: { code: normalizedCode },
    });
    if (existing) {
      sendError(res, 'CODE_ALREADY_EXISTS', 409);
      return;
    }

    const discount = await prisma.discountCode.create({
      data: {
        code: normalizedCode,
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

    // Validate value if provided (fetch existing type to cross-check)
    if (value !== undefined) {
      const existing = await prisma.discountCode.findUnique({ where: { id }, select: { type: true } });
      if (existing) {
        const err = validateDiscountValue(existing.type as DiscountType, value);
        if (err) { sendError(res, err, 400); return; }
      }
    }
    if (maxUses !== undefined && maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }

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

