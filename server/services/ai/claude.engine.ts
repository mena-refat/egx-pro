import type { IAnalysisEngine, AnalysisEngineRequest, AnalysisEngineResponse } from './types.ts';
import { logger } from '../../lib/logger.ts';

export class ClaudeAnalysisEngine implements IAnalysisEngine {
  readonly name = 'claude';

  async generate(request: AnalysisEngineRequest): Promise<AnalysisEngineResponse> {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) throw new Error('CLAUDE_API_KEY is not set');

    const models = ['claude-sonnet-4-6', 'claude-3-5-sonnet-20241022'];

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
          const errText = await res.text().catch(() => '');
          logger.error('Claude API Error', { model, status: res.status, err: errText.slice(0, 300) });
          continue; // جرب الموديل اللي بعده
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

        logger.warn('Claude empty response', { model });
        continue;

      } catch (err) {
        logger.warn(`Model ${model} failed: ${(err as Error).message}`);
        continue;
      }
    }

    throw new Error('All Claude models failed');
  }
}
