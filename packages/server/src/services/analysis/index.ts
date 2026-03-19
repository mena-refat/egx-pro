import { createAnalysis } from './analysis.create.ts';
import { compareAnalysis } from './analysis.compare.ts';
import { quickAnalysis } from './analysis.quick.ts';
import { recommendationsAnalysis } from './analysis.recommendations.ts';

export const AnalysisService = {
  create: createAnalysis,
  compare: compareAnalysis,
  quickAnalysis,
  recommendations: recommendationsAnalysis,
};
