import type { IAnalysisEngine, AnalysisEngineRequest, AnalysisEngineResponse } from './types.ts';
import { logger } from '../../lib/logger.ts';
import { ANALYSIS_OPENAI_TIMEOUT_MS } from '../../lib/constants.ts';

function extractOpenAiText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && 'text' in part) {
        const value = (part as { text?: unknown }).text;
        return typeof value === 'string' ? value : '';
      }
      return '';
    })
    .join('');
}

export class OpenAiAnalysisEngine implements IAnalysisEngine {
  readonly name = 'openai';

  async generate(request: AnalysisEngineRequest): Promise<AnalysisEngineResponse> {
    const raw = process.env.OPENAI_API_KEY;
    const apiKey = typeof raw === 'string' ? raw.trim() : '';
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

    const models = ['gpt-4.1-mini', 'gpt-4o-mini'];
    let lastStatus = 0;
    let lastError = '';

    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), ANALYSIS_OPENAI_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model,
              temperature: request.temperature ?? 0.1,
              max_completion_tokens: request.maxTokens ?? 1200,
              messages: [
                { role: 'system', content: request.systemPrompt },
                { role: 'user', content: request.userMessage },
              ],
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        if (!res.ok) {
          lastStatus = res.status;
          const rawText = await res.text().catch(() => '');
          lastError = rawText;
          logger.warn('OpenAI API Error', { model, status: res.status, err: rawText.slice(0, 300) });
          continue;
        }

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: unknown } }>;
        };

        const text = extractOpenAiText(data.choices?.[0]?.message?.content);
        if (text) {
          return { text, provider: `${this.name}/${model}`, model };
        }

        lastError = 'empty response';
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        logger.warn('OpenAI model failed', { model, error: lastError });
      }
    }

    const detail = lastStatus ? ` [${lastStatus}] ${lastError.slice(0, 100)}` : ` ${lastError.slice(0, 100)}`;
    throw new Error(`All OpenAI models failed${detail}`);
  }
}
