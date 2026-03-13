/**
 * AI Analysis Engine — single entry point for the app.
 * Today: Claude only (best accuracy for EGX stock analysis).
 * Later: you can add a router that calls multiple models and picks the best result,
 * similar to how Cursor uses OpenAI, Gemini, Claude under one layer.
 */

import type { IAnalysisEngine } from './types.ts';
import { ClaudeAnalysisEngine } from './claude.engine.ts';

const claudeEngine = new ClaudeAnalysisEngine();

/** Default engine used for all analysis (single-stock, compare, recommendations). */
export const analysisEngine: IAnalysisEngine = claudeEngine;

export type { IAnalysisEngine, AnalysisEngineRequest, AnalysisEngineResponse } from './types.ts';
