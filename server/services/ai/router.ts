import { logger } from '../../lib/logger.ts';
import { ClaudeAnalysisEngine } from './claude.engine.ts';
import { GeminiAnalysisEngine } from './gemini.engine.ts';
import { OpenAiAnalysisEngine } from './openai.engine.ts';
import type { AnalysisEngineRequest, AnalysisEngineResponse, AiTaskType, IAnalysisEngine } from './types.ts';

type RoutePlan = {
  primary: IAnalysisEngine;
  fallback?: IAnalysisEngine;
};

const claudeEngine = new ClaudeAnalysisEngine();
const geminiEngine = new GeminiAnalysisEngine();
const openAiEngine = new OpenAiAnalysisEngine();

function getRoutePlan(taskType: AiTaskType): RoutePlan {
  switch (taskType) {
    case 'news_summarization':
      return { primary: geminiEngine, fallback: openAiEngine };
    case 'news_extraction':
      return { primary: openAiEngine, fallback: geminiEngine };
    case 'news_market_impact':
    case 'financial_analysis':
      return { primary: claudeEngine, fallback: openAiEngine };
    default:
      return { primary: claudeEngine, fallback: openAiEngine };
  }
}

export class AiRouterEngine implements IAnalysisEngine {
  readonly name = 'ai-router';

  async generate(request: AnalysisEngineRequest): Promise<AnalysisEngineResponse> {
    const plan = getRoutePlan(request.taskType);
    try {
      const result = await plan.primary.generate(request);
      logger.info('AI router primary success', {
        taskType: request.taskType,
        provider: result.provider,
      });
      return result;
    } catch (primaryError) {
      logger.warn('AI router primary failed', {
        taskType: request.taskType,
        provider: plan.primary.name,
        error: primaryError instanceof Error ? primaryError.message : 'UNKNOWN_ERROR',
      });
      if (!plan.fallback) throw primaryError;
    }

    const fallback = plan.fallback;
    if (!fallback) {
      throw new Error(`No fallback provider configured for task ${request.taskType}`);
    }

    const fallbackResult = await fallback.generate(request);
    logger.info('AI router fallback success', {
      taskType: request.taskType,
      provider: fallbackResult.provider,
    });
    return fallbackResult;
  }
}

export const aiRouter = new AiRouterEngine();
