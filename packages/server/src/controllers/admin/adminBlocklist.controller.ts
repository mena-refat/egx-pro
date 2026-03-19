import type { Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { sendSuccess, sendError } from '../../lib/apiResponse.ts';
import { adminAudit, type AdminRequest } from '../../middleware/adminAuth.middleware.ts';

export const AdminBlocklistController = {
  async list(_req: AdminRequest, res: Response): Promise<void> {
    const items = await prisma.blockedIdentifier.findMany({
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, items);
  },

  async add(req: AdminRequest, res: Response): Promise<void> {
    const { type, value, reason } = req.body as { type?: string; value?: string; reason?: string };
    if (!type || !value?.trim()) { sendError(res, 'VALIDATION_ERROR', 400); return; }
    const allowed = ['EMAIL', 'PHONE', 'EMAIL_DOMAIN'];
    if (!allowed.includes(type)) { sendError(res, 'VALIDATION_ERROR', 400); return; }

    const normalized = value.trim().toLowerCase();
    const existing = await prisma.blockedIdentifier.findUnique({ where: { type_value: { type: type as 'EMAIL' | 'PHONE' | 'EMAIL_DOMAIN', value: normalized } } });
    if (existing) { sendError(res, 'ALREADY_BLOCKED', 409); return; }

    const item = await prisma.blockedIdentifier.create({
      data: { type: type as 'EMAIL' | 'PHONE' | 'EMAIL_DOMAIN', value: normalized, reason: reason?.trim() || null, blockedBy: req.admin?.id ?? null },
    });
    if (req.admin) await adminAudit(req.admin.id, 'BLOCKLIST_ADDED', item.id, `${type}: ${normalized}`, req);
    sendSuccess(res, item, 201);
  },

  async remove(req: AdminRequest, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const item = await prisma.blockedIdentifier.findUnique({ where: { id } });
    if (!item) { sendError(res, 'NOT_FOUND', 404); return; }
    await prisma.blockedIdentifier.delete({ where: { id } });
    if (req.admin) await adminAudit(req.admin.id, 'BLOCKLIST_REMOVED', id, `${item.type}: ${item.value}`, req);
    sendSuccess(res, { ok: true });
  },
};
