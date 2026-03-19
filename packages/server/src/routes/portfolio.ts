import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.ts';
import { PortfolioController } from '../controllers/portfolio.controller.ts';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { addHoldingBodySchema, updateHoldingBodySchema } from '../schemas/portfolio.schema.ts';
import { idParamSchema } from '../schemas/params.ts';

const router = Router();

router.get('/', authenticate, PortfolioController.getAll);
router.post('/add', authenticate, idempotencyMiddleware, validate(addHoldingBodySchema, 'body'), PortfolioController.add);
router.put('/:id', authenticate, idempotencyMiddleware, validate(idParamSchema, 'params'), validate(updateHoldingBodySchema, 'body'), PortfolioController.update);
router.delete('/:id', authenticate, idempotencyMiddleware, validate(idParamSchema, 'params'), PortfolioController.delete);
router.get('/performance', authenticate, PortfolioController.performance);

export default router;
