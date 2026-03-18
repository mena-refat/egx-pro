import { Request, Response, NextFunction } from 'express';
import { AnalysisService } from '../services/analysis/index.ts';
import { AnalysisRepository } from '../repositories/analysis.repository.ts';
import type { AuthRequest } from '../routes/types.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

function runNoAuth(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const AnalysisController = {
  quick: run(async (req, res) => {
    const ticker = (req.params as { ticker?: string }).ticker ?? '';
    if (!ticker) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }
    const result = await AnalysisService.quickAnalysis(ticker);
    sendSuccess(res, { analysis: result });
  }),

  create: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const ticker = req.params.ticker ?? '';
    const result = await AnalysisService.create(userId, ticker);
    sendSuccess(res, {
      analysis: result.analysis,
      id: result.id,
      newUnseenAchievements: result.newUnseenAchievements,
    });
  }),

  compare: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const { ticker1, ticker2 } = req.body ?? {};
    const t1 = typeof ticker1 === 'string' ? ticker1.trim().toUpperCase() : '';
    const t2 = typeof ticker2 === 'string' ? ticker2.trim().toUpperCase() : '';
    const result = await AnalysisService.compare(userId, t1, t2);
    sendSuccess(res, { comparison: result.comparison, id: result.id });
  }),

  recommendations: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const result = await AnalysisService.recommendations(userId, req.body);
    sendSuccess(res, { recommendations: result.recommendations, id: result.id });
  }),

  accuracy: run(async (_req, res) => {
    const stats = await AnalysisRepository.getAccuracyStats();
    const recentChecked = await AnalysisRepository.findRecentChecked(10);
    sendSuccess(res, { stats, recentChecked });
  }),

  /** تشخيص اتصال Claude — غير متاح في production (لا تسريب API key). */
  testConnection: runNoAuth(async (_req, res) => {
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
        const body = (await r.json().catch(() => ({}))) as {
          content?: Array<{ type?: string; text?: string }>;
          error?: { message?: string };
        };
        if (r.ok) {
          const text = (body?.content ?? [])
            .filter((b) => b?.type === 'text')
            .map((b) => b?.text ?? '')
            .join('');
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
  }),
};
