import type { IAnalysisEngine } from './types.ts';
import { aiRouter } from './router.ts';

/** Default engine used for all AI tasks through centralized routing. */
export const analysisEngine: IAnalysisEngine = aiRouter;

export { aiRouter } from './router.ts';
export { ClaudeAnalysisEngine } from './claude.engine.ts';
export { GeminiAnalysisEngine } from './gemini.engine.ts';
export { OpenAiAnalysisEngine } from './openai.engine.ts';
export type { IAnalysisEngine, AnalysisEngineRequest, AnalysisEngineResponse, AiTaskType } from './types.ts';
