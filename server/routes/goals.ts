import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.ts';
import { verifyAccessToken } from '../../src/lib/auth.ts';
import { goalSchema } from '../../src/lib/validations.ts';
import { ZodError } from 'zod';
import { AuthRequest } from './types';

const router = Router();

const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token) as { sub: string };
    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get goals
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId },
      orderBy: { targetDate: 'asc' },
    });
    res.json(goals);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add goal
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = goalSchema.parse(req.body);
    const { name, targetAmount, targetDate, type } = validatedData;
    const goal = await prisma.goal.create({
      data: {
        userId: req.userId!,
        name,
        targetAmount,
        targetDate: new Date(targetDate),
        type,
      },
    });
    res.status(201).json(goal);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete goal
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const goal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (goal.userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.goal.delete({
      where: { id },
    });

    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
