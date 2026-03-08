import { Router } from 'express';
import { NewsController, newsErrorHandler } from '../controllers/news.controller.ts';

const router = Router();

router.get('/market', NewsController.getMarket);
router.get('/:ticker', NewsController.getByTicker);

router.use(newsErrorHandler);

export default router;
