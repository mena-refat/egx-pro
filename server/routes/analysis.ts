import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware.ts';
import { AnalysisController } from '../controllers/analysis.controller.ts';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { compareStocksBodySchema, recommendationsBodySchema } from '../schemas/analysis.schema.ts';
import { tickerParamSchema } from '../schemas/params.ts';

const router = Router();

// تشخيص اتصال Claude — متاح في dev فقط
if (process.env.NODE_ENV !== 'production') {
  router.get('/test-connection', AnalysisController.testConnection);
}

// ipKeyGenerator يُستخدم لمعالجة IPv6 بشكل صحيح (يمنع مشاكل الإقلاع)
const analysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'RATE_LIMIT_EXCEEDED' },
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? 'unknown'),
});

router.get('/accuracy', AnalysisController.accuracy);
// Quick analysis — بدون authenticate (مجاني للجميع، صفر tokens)
router.get('/quick/:ticker', validate(tickerParamSchema, 'params'), AnalysisController.quick);
router.post('/compare', authenticate, analysisLimiter, idempotencyMiddleware, validate(compareStocksBodySchema, 'body'), AnalysisController.compare);
router.post('/recommendations', authenticate, analysisLimiter, idempotencyMiddleware, validate(recommendationsBodySchema, 'body'), AnalysisController.recommendations);
router.post('/:ticker', authenticate, analysisLimiter, idempotencyMiddleware, validate(tickerParamSchema, 'params'), AnalysisController.create);

export default router;
