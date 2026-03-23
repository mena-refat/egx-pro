import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.ts';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { pageLimitQuerySchema } from '../schemas/params.ts';
import { NotificationsController } from '../controllers/notifications.controller.ts';
import { PushController } from '../controllers/push.controller.ts';

const router = Router();

router.get('/', authenticate, validate(pageLimitQuerySchema, 'query'), NotificationsController.getAll);
router.post('/mark-read', authenticate, idempotencyMiddleware, NotificationsController.markRead);
router.patch('/read-all', authenticate, idempotencyMiddleware, NotificationsController.markAllRead);
router.patch('/:id/read', authenticate, idempotencyMiddleware, NotificationsController.markOneRead);
router.delete('/clear-all', authenticate, idempotencyMiddleware, NotificationsController.clearAll);
router.delete('/:id', authenticate, idempotencyMiddleware, NotificationsController.deleteOne);

// ── Web Push ─────────────────────────────────────────────────────────────────
router.get('/push/vapid-key',   PushController.vapidKey);
router.get('/push/status',      authenticate, PushController.status);
router.post('/push/subscribe',  authenticate, PushController.subscribe);
router.delete('/push/unsubscribe', authenticate, PushController.unsubscribe);

export default router;
