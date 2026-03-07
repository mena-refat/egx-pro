import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.ts';
import { GoalsController } from '../controllers/goals.controller.ts';

const router = Router();

router.get('/', authenticate, GoalsController.getAll);
router.post('/', authenticate, GoalsController.create);
router.put('/:id', authenticate, GoalsController.update);
router.patch('/:id/amount', authenticate, GoalsController.updateAmount);
router.patch('/:id/complete', authenticate, GoalsController.complete);
router.delete('/:id', authenticate, GoalsController.delete);

export default router;
