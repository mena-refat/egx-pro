import type { IAnalysisEngine, AnalysisEngineRequest, AnalysisEngineResponse } from './types.ts';
import { logger } from '../../lib/logger.ts';

const MODEL = 'claude-sonnet-4-6';

/**
 * Claude-based analysis engine. Used for highest accuracy in stock analysis
 * (fundamental, technical, sentiment, EGX-specific factors).
 */
export class ClaudeAnalysisEngine implements IAnalysisEngine {
  readonly name = 'claude';

  async generate(request: AnalysisEngineRequest): Promise<AnalysisEngineResponse> {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY is not set');
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: request.maxTokens ?? 2500,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userMessage }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error('Claude API Error', { status: res.status, errText });
      throw new Error(`Claude API failed: ${res.status}`);
    }

    const data = (await res.json()) as { content: Array<{ text: string }> };
    const text = data.content[0]?.text;
    if (!text) {
      logger.error('Claude API: empty content');
      throw new Error('Claude API returned empty content');
    }

    return { text, provider: this.name };
  }
}
