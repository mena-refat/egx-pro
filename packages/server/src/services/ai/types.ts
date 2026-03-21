/**
 * AI Analysis Engine — abstraction layer for stock analysis.
 * Like Cursor: the app uses "the best available engine" on top of one or more providers
 * (Claude, OpenAI, Gemini, etc.) to get the most accurate analysis.
 */

export type AiTaskType =
  // ── Legacy (kept for backward compat) ────────────────────────────────────
  | 'news_summarization'
  | 'news_extraction'
  | 'news_market_impact'
  // ── Smart pipeline (new) ─────────────────────────────────────────────────
  /** Stage 1 — Gemini (cheap): summary + impact level in one shot */
  | 'news_quick_analysis'
  /** Stage 3 — OpenAI: structure comprehensive JSON from enriched context */
  | 'news_structure'
  /** Stage 4 — Claude (only high/critical): deep investment report */
  | 'news_deep_report'
  // ── Ingest ────────────────────────────────────────────────────────────────
  /** Pre-persist: Gemini cleans the title + writes a short summary before DB save */
  | 'news_ingest_summary'
  // ── Financial analysis ────────────────────────────────────────────────────
  | 'financial_analysis';

/** Impact level assigned by Stage 1 (Gemini) */
export type NewsImpactLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AnalysisEngineRequest {
  taskType: AiTaskType;
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  responseType?: 'text' | 'json';
}

export interface AnalysisEngineResponse {
  text: string;
  provider: string;
  model?: string;
}

/**
 * Any analysis provider must implement this interface.
 * The service layer calls the default engine; you can swap or add a router
 * that calls multiple providers and picks the best result.
 */
export interface IAnalysisEngine {
  readonly name: string;
  generate(request: AnalysisEngineRequest): Promise<AnalysisEngineResponse>;
}
