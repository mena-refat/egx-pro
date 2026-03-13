import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.ts';
import { PortfolioController } from '../controllers/portfolio.controller.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { addHoldingBodySchema, updateHoldingBodySchema } from '../schemas/portfolio.schema.ts';
import { idParamSchema } from '../schemas/params.ts';

const router = Router();

router.get('/', authenticate, PortfolioController.getAll);
router.post('/add', authenticate, validate(addHoldingBodySchema, 'body'), PortfolioController.add);
router.put('/:id', authenticate, validate(idParamSchema, 'params'), validate(updateHoldingBodySchema, 'body'), PortfolioController.update);
router.delete('/:id', authenticate, validate(idParamSchema, 'params'), PortfolioController.delete);
router.get('/performance', authenticate, PortfolioController.performance);

export default router;
