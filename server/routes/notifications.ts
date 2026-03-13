import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { pageLimitQuerySchema } from '../schemas/params.ts';
import { NotificationsController } from '../controllers/notifications.controller.ts';

const router = Router();

router.get('/', authenticate, validate(pageLimitQuerySchema, 'query'), NotificationsController.getAll);
router.post('/mark-read', authenticate, NotificationsController.markRead);
router.patch('/read-all', authenticate, NotificationsController.markAllRead);
router.patch('/:id/read', authenticate, NotificationsController.markOneRead);
router.delete('/clear-all', authenticate, NotificationsController.clearAll);
router.delete('/:id', authenticate, NotificationsController.deleteOne);

export default router;
