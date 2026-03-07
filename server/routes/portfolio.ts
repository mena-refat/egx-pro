import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.ts';
import { PortfolioController } from '../controllers/portfolio.controller.ts';

const router = Router();

router.get('/', authenticate, PortfolioController.getAll);
router.post('/add', authenticate, PortfolioController.add);
router.put('/:id', authenticate, PortfolioController.update);
router.delete('/:id', authenticate, PortfolioController.delete);
router.get('/performance', authenticate, PortfolioController.performance);

export default router;
