import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.ts';
import { verifyAccessToken } from '../../src/lib/auth.ts';
import { AuthRequest } from './types';

const router = Router();

const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
  try {
    const decoded = verifyAccessToken(authHeader.split(' ')[1]) as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, isDeleted: true },
    });
    if (!user || user.isDeleted) return res.status(401).json({ error: 'unauthorized' });
    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
};

// GET /api/notifications — آخر 20 إشعار + عدد الغير مقروءة
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const [list, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    res.json({ notifications: list, unreadCount });
  } catch (err) {
    console.error('Notifications list error:', err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

// POST /api/notifications/mark-read — تعليم الكل كمقروء (legacy)
router.post('/mark-read', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    await prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// PATCH /api/notifications/read-all — تعليم الكل كمقروء
router.patch('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    await prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read all error:', err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// PATCH /api/notifications/:id/read — تعليم إشعار واحد كمقروء
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  try {
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Mark one read error:', err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// DELETE /api/notifications/clear-all — حذف كل الإشعارات
router.delete('/clear-all', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    await prisma.notification.deleteMany({
      where: { userId },
    });
    res.status(204).send();
  } catch (err) {
    console.error('Clear all notifications error:', err);
    res.status(500).json({ error: 'Failed to clear' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    await prisma.notification.deleteMany({
      where: { id: req.params.id, userId },
    });
    res.status(204).send();
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;
