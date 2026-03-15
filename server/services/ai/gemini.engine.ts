import type { IAnalysisEngine, AnalysisEngineRequest, AnalysisEngineResponse } from './types.ts';
import { logger } from '../../lib/logger.ts';

function extractGeminiText(data: {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}): string {
  return (data.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('');
}

export class GeminiAnalysisEngine implements IAnalysisEngine {
  readonly name = 'gemini';

  async generate(request: AnalysisEngineRequest): Promise<AnalysisEngineResponse> {
    const raw = process.env.GEMINI_API_KEY;
    const apiKey = typeof raw === 'string' ? raw.trim() : '';
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

    const models = ['gemini-1.5-flash', 'gemini-2.0-flash'];
    let lastStatus = 0;
    let lastError = '';

    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45_000);
        let res: Response;
        try {
          res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: request.systemPrompt }],
              },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: request.userMessage }],
                },
              ],
              generationConfig: {
                temperature: request.temperature ?? 0.1,
                maxOutputTokens: request.maxTokens ?? 800,
                responseMimeType: request.responseType === 'json' ? 'application/json' : 'text/plain',
              },
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
          logger.warn('Gemini API Error', { model, status: res.status, err: rawText.slice(0, 300) });
          continue;
        }

        const data = (await res.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string }>;
            };
          }>;
        };
        const text = extractGeminiText(data);
        if (text) {
          return { text, provider: `${this.name}/${model}`, model };
        }

        lastError = 'empty response';
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        logger.warn('Gemini model failed', { model, error: lastError });
      }
    }

    const detail = lastStatus ? ` [${lastStatus}] ${lastError.slice(0, 100)}` : ` ${lastError.slice(0, 100)}`;
    throw new Error(`All Gemini models failed${detail}`);
  }
}
