import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AuthRequest } from './types.ts';
import { ONE_HOUR_MS } from '../lib/constants.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { AnalysisController } from '../controllers/analysis.controller.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { compareStocksBodySchema, recommendationsBodySchema } from '../schemas/analysis.schema.ts';
import { tickerParamSchema } from '../schemas/params.ts';

const router = Router();

// ══ تشخيص اتصال Claude — غير متاح في production (لا تسريب API key) ══
router.get('/test-connection', async (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }

  const rawKey = process.env.CLAUDE_API_KEY;
  const apiKey = typeof rawKey === 'string' ? rawKey.trim() : '';
  if (!apiKey) {
    res.json({ ok: false, error: 'CLAUDE_API_KEY not configured' });
    return;
  }

  const results: Array<{ model: string; status: string; ms: number; errorDetail?: string }> = [];
  const models = ['claude-sonnet-4-6', 'claude-3-5-sonnet-20241022'];

  for (const model of models) {
    const start = Date.now();
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 20,
          messages: [{ role: 'user', content: 'قل مرحبا' }],
        }),
        signal: AbortSignal.timeout(10000),
      });
      const body = await r.json().catch(() => ({})) as { content?: Array<{ type?: string; text?: string }>; error?: { message?: string } };
      if (r.ok) {
        const text = (body?.content ?? []).filter((b) => b?.type === 'text').map((b) => b?.text ?? '').join('');
        results.push({ model, status: `✅ ${text || 'ok'}`, ms: Date.now() - start });
        break;
      }
      const errMsg = body?.error?.message ?? '';
      results.push({
        model,
        status: `❌ ${r.status}`,
        ms: Date.now() - start,
        errorDetail: errMsg || JSON.stringify(body).slice(0, 250),
      });
    } catch (e) {
      results.push({ model, status: `❌ ${(e as Error).message}`, ms: Date.now() - start });
    }
  }

  res.json({ ok: results.some((r) => r.status.startsWith('✅')), results });
});

const analysisLimiter = rateLimit({
  windowMs: ONE_HOUR_MS,
  max: 20,
  message: { error: 'RATE_LIMIT_EXCEEDED' },
  keyGenerator: (req, res) => {
    const userId = (req as AuthRequest).user?.id;
    if (userId) return userId;
    return (req.ip ?? 'unknown').replace(/^::ffff:/, '');
  },
  validate: {
    xForwardedForHeader: false,
    trustProxy: false,
    ip: false,
  },
});

router.get('/accuracy', AnalysisController.accuracy);
// Quick analysis — بدون authenticate (مجاني للجميع، صفر tokens)
router.get('/quick/:ticker', validate(tickerParamSchema, 'params'), AnalysisController.quick);
router.post('/compare', authenticate, analysisLimiter, validate(compareStocksBodySchema, 'body'), AnalysisController.compare);
router.post('/recommendations', authenticate, analysisLimiter, validate(recommendationsBodySchema, 'body'), AnalysisController.recommendations);
router.post('/:ticker', authenticate, analysisLimiter, validate(tickerParamSchema, 'params'), AnalysisController.create);

export default router;
