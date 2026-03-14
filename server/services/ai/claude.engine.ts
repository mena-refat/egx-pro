import type { IAnalysisEngine, AnalysisEngineRequest, AnalysisEngineResponse } from './types.ts';
import { logger } from '../../lib/logger.ts';

export class ClaudeAnalysisEngine implements IAnalysisEngine {
  readonly name = 'claude';

  async generate(request: AnalysisEngineRequest): Promise<AnalysisEngineResponse> {
    const raw = process.env.CLAUDE_API_KEY;
    const apiKey = typeof raw === 'string' ? raw.trim() : '';
    if (!apiKey) throw new Error('CLAUDE_API_KEY is not set');

    const models = ['claude-sonnet-4-6', 'claude-3-5-sonnet-20241022'];
    let lastStatus = 0;
    let lastErrText = '';

    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90_000);

        let res: Response;
        try {
          res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model,
              max_tokens: request.maxTokens ?? 4000,
              system: request.systemPrompt,
              messages: [{ role: 'user', content: request.userMessage }],
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        if (!res.ok) {
          lastStatus = res.status;
          const raw = await res.text().catch(() => '');
          lastErrText = raw;
          logger.error('Claude API Error', { model, status: res.status, err: raw.slice(0, 300) });
          try {
            const errJson = JSON.parse(raw) as { error?: { message?: string } };
            if (errJson?.error?.message) lastErrText = errJson.error.message;
          } catch {
            /* keep lastErrText as raw */
          }
          continue;
        }

        const data = (await res.json()) as {
          content?: Array<{ type: string; text?: string }>;
        };

        const text = (data.content ?? [])
          .filter(b => b.type === 'text' && b.text)
          .map(b => b.text!)
          .join('');

        if (text) {
          logger.info('Claude analysis success', { model, chars: text.length });
          return { text, provider: `${this.name}/${model}` };
        }

        lastStatus = res.status;
        lastErrText = 'empty response';
        logger.warn('Claude empty response', { model });
        continue;

      } catch (err) {
        const msg = (err as Error).message ?? '';
        if (msg.includes('abort') || msg.includes('AbortError')) {
          lastStatus = 504;
          lastErrText = 'timeout';
        }
        logger.warn(`Model ${model} failed: ${msg}`);
        continue;
      }
    }

    const detail = lastStatus ? ` [${lastStatus}] ${lastErrText.slice(0, 100)}` : '';
    throw new Error(`All Claude models failed${detail}`);
  }
}
