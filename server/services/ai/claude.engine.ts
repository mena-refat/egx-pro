import type { IAnalysisEngine, AnalysisEngineRequest, AnalysisEngineResponse } from './types.ts';
import { logger } from '../../lib/logger.ts';
import { withRetry } from '../../lib/retry.ts';

const MODEL = 'claude-sonnet-4-6';

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string };

interface AnthropicResponse {
  content: ContentBlock[];
  stop_reason: 'end_turn' | 'tool_use' | string;
}

type Message =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: ContentBlock[] }
  | { role: 'user'; content: ContentBlock[] };

/**
 * Claude-based analysis engine with built-in web search.
 * Uses web_search_20250305 (Anthropic-hosted) so Claude can fetch
 * live EGX price, financials, and news before analyzing.
 */
export class ClaudeAnalysisEngine implements IAnalysisEngine {
  readonly name = 'claude';

  async generate(request: AnalysisEngineRequest): Promise<AnalysisEngineResponse> {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY is not set');
    }

    const messages: Message[] = [
      { role: 'user', content: request.userMessage },
    ];

    const tools = [{ type: 'web_search_20250305', name: 'web_search' }];

    // Tool-use loop — max 5 rounds (web search may trigger multiple rounds)
    for (let round = 0; round < 5; round++) {
      const res = await withRetry(() => fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: request.maxTokens ?? 4000,
          system: request.systemPrompt,
          messages,
          tools,
        }),
      }), { maxAttempts: 2, baseDelayMs: 1000 });

      if (!res.ok) {
        const errText = await res.text();
        logger.error('Claude API Error', { status: res.status, errText });
        throw new Error(`Claude API failed: ${res.status}`);
      }

      const data = (await res.json()) as AnthropicResponse;

      // Done — extract all text blocks
      if (data.stop_reason !== 'tool_use') {
        const text = (data.content ?? [])
          .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
          .map((b) => b.text)
          .join('');

        if (!text) {
          logger.error('Claude API: empty text content', {
            stop_reason: data.stop_reason,
            block_types: data.content?.map((b) => b.type),
          });
          throw new Error('Claude API returned empty content');
        }
        return { text, provider: this.name };
      }

      // Claude wants to use a tool — add assistant turn and provide tool results
      messages.push({ role: 'assistant', content: data.content });

      const toolResults: ContentBlock[] = data.content
        .filter((b): b is { type: 'tool_use'; id: string; name: string; input: unknown } =>
          b.type === 'tool_use'
        )
        .map((b) => ({
          type: 'tool_result' as const,
          tool_use_id: b.id,
          // For Anthropic-hosted web_search, the results are injected server-side.
          // Passing an empty string signals "acknowledged — use what you found."
          content: '',
        }));

      messages.push({ role: 'user', content: toolResults });
    }

    throw new Error('Claude API: exceeded tool-use loop limit');
  }
}
