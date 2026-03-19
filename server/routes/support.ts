import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import type { AuthRequest } from './types.ts';

const router = Router();

const SUBJECT_MAX = 120;
const MESSAGE_MAX = 2000;
const PAGE_SIZE    = 20;

router.post('/', authenticate, async (req, res) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { sendError(res, 'UNAUTHORIZED', 401); return; }

  const { subject, message } = req.body as { subject?: string; message?: string };
  const trimmedSubject = subject?.trim() ?? '';
  const trimmedMessage = message?.trim() ?? '';

  if (!trimmedSubject || !trimmedMessage) {
    sendError(res, 'VALIDATION_ERROR', 400); return;
  }
  if (trimmedSubject.length > SUBJECT_MAX || trimmedMessage.length > MESSAGE_MAX) {
    sendError(res, 'VALIDATION_ERROR', 400); return;
  }

  const ticket = await prisma.supportTicket.create({
    data: { userId, subject: trimmedSubject, message: trimmedMessage },
    select: { id: true, subject: true, status: true, createdAt: true },
  });

  sendSuccess(res, ticket, 201);
});

router.get('/my', authenticate, async (req, res) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { sendError(res, 'UNAUTHORIZED', 401); return; }

  const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true, subject: true, message: true, status: true, priority: true,
        reply: true, repliedAt: true, replyRead: true, rating: true, ratedAt: true,
        createdAt: true,
      },
    }),
    prisma.supportTicket.count({ where: { userId } }),
  ]);

  sendSuccess(res, { tickets, total, page, pages: Math.ceil(total / PAGE_SIZE) });
});

router.patch('/:id/rate', authenticate, async (req, res) => {
  const userId = (req as AuthRequest).user?.id;
  const { id } = req.params as { id: string };
  const { rating } = req.body as { rating?: unknown };

  if (!userId) { sendError(res, 'UNAUTHORIZED', 401); return; }

  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    sendError(res, 'VALIDATION_ERROR', 400); return;
  }

  // Fetch ticket — always scope to userId to prevent IDOR
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { userId: true, status: true, rating: true },
  });
  if (!ticket || ticket.userId !== userId) { sendError(res, 'NOT_FOUND', 404); return; }
  if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
    sendError(res, 'TICKET_NOT_CLOSED', 400); return;
  }
  if (ticket.rating !== null) { sendError(res, 'ALREADY_RATED', 409); return; }

  // Use ORM — no raw SQL
  await prisma.supportTicket.update({
    where: { id },
    data: { rating: ratingNum, ratedAt: new Date() },
  });

  sendSuccess(res, { ok: true });
});

router.patch('/:id/cancel', authenticate, async (req, res) => {
  const userId = (req as AuthRequest).user?.id;
  const { id } = req.params as { id: string };
  if (!userId) { sendError(res, 'UNAUTHORIZED', 401); return; }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { userId: true, status: true },
  });
  if (!ticket || ticket.userId !== userId) { sendError(res, 'NOT_FOUND', 404); return; }
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' || ticket.status === 'CANCELLED') {
    sendError(res, 'TICKET_ALREADY_CLOSED', 400); return;
  }

  await prisma.supportTicket.update({
    where: { id },
    data: { status: 'CANCELLED' as never },
  });

  sendSuccess(res, { ok: true });
});

router.patch('/:id/read-reply', authenticate, async (req, res) => {
  const userId = (req as AuthRequest).user?.id;
  const { id } = req.params as { id: string };
  if (!userId) { sendError(res, 'UNAUTHORIZED', 401); return; }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!ticket || ticket.userId !== userId) { sendError(res, 'NOT_FOUND', 404); return; }

  await prisma.supportTicket.update({ where: { id }, data: { replyRead: true } });
  sendSuccess(res, { ok: true });
});

export default router;
