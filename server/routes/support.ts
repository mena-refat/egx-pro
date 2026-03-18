import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import type { AuthRequest } from './types.ts';

const router = Router();

router.post('/', authenticate, async (req, res) => {
  const userId = (req as AuthRequest).user?.id;
  const { subject, message } = req.body as { subject?: string; message?: string };

  if (!userId) {
    sendError(res, 'UNAUTHORIZED', 401);
    return;
  }
  if (!subject?.trim() || !message?.trim()) {
    sendError(res, 'VALIDATION_ERROR', 400);
    return;
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      subject: subject.trim(),
      message: message.trim(),
    },
  });

  sendSuccess(res, ticket, 201);
});

router.get('/my', authenticate, async (req, res) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) {
    sendError(res, 'UNAUTHORIZED', 401);
    return;
  }

  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  sendSuccess(res, tickets);
});

export default router;

