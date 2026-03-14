import type { IAnalysisEngine, AnalysisEngineRequest, AnalysisEngineResponse } from './types.ts';
import { logger } from '../../lib/logger.ts';

export class ClaudeAnalysisEngine implements IAnalysisEngine {
  readonly name = 'claude';

  async generate(request: AnalysisEngineRequest): Promise<AnalysisEngineResponse> {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) throw new Error('CLAUDE_API_KEY is not set');

    // جرب الموديلات بالترتيب — لو واحد فشل جرب اللي بعده
    const models = ['claude-sonnet-4-6', 'claude-3-5-sonnet-20241022'];

    for (const model of models) {
      // ══ أولاً: جرب مع web_search ══
      try {
        const result = await this.attempt(apiKey, model, request, true);
        if (result) return result;
      } catch (err) {
        logger.warn(`${model} + web_search failed: ${(err as Error).message}`);
      }

      // ══ ثانياً: جرب بدون web_search ══
      try {
        const result = await this.attempt(apiKey, model, request, false);
        if (result) return result;
      } catch (err) {
        logger.warn(`${model} no-tools failed: ${(err as Error).message}`);
      }
    }

    throw new Error('All Claude models failed');
  }

  private async attempt(
    apiKey: string,
    model: string,
    request: AnalysisEngineRequest,
    useWebSearch: boolean
  ): Promise<AnalysisEngineResponse | null> {
    const messages: Array<Record<string, unknown>> = [
      { role: 'user', content: useWebSearch
        ? request.userMessage
        : request.userMessage + '\n\nملاحظة: لا تتوفر أداة بحث. استخدم البيانات المقدمة ومعرفتك.' },
    ];

    for (let round = 0; round < 5; round++) {
      const body: Record<string, unknown> = {
        model,
        max_tokens: request.maxTokens ?? 4000,
        system: request.systemPrompt,
        messages,
      };
      if (useWebSearch) {
        body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
      }

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
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        logger.error('Claude API Error', { model, status: res.status, err: errText.slice(0, 300) });
        throw new Error(`Claude ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json() as {
        content?: Array<{ type: string; text?: string; id?: string }>;
        stop_reason?: string;
      };

      if (data.stop_reason !== 'tool_use') {
        const text = (data.content ?? [])
          .filter(b => b.type === 'text' && b.text)
          .map(b => b.text!)
          .join('');
        if (!text) throw new Error('Empty response');
        return { text, provider: `${this.name}/${model}` };
      }

      // Claude عايز يستخدم web_search
      messages.push({ role: 'assistant', content: data.content as unknown[] });
      const toolResults = (data.content ?? [])
        .filter(b => b.type === 'tool_use' && b.id)
        .map(b => ({ type: 'tool_result', tool_use_id: b.id!, content: '' }));
      if (toolResults.length === 0) break;
      messages.push({ role: 'user', content: toolResults });
    }

    throw new Error('Tool loop limit');
  }
}
