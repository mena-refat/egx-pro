/**
 * AI Analysis Engine — abstraction layer for stock analysis.
 * Like Cursor: the app uses "the best available engine" on top of one or more providers
 * (Claude, OpenAI, Gemini, etc.) to get the most accurate analysis.
 */

export interface AnalysisEngineRequest {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
}

export interface AnalysisEngineResponse {
  text: string;
  provider: string;
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
