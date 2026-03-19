import { prisma } from '../lib/prisma.ts';
import { logger } from '../lib/logger.ts';

export async function runResetAiUsageJob(): Promise<void> {
  try {
    const resetDate = new Date();
    const nextReset = new Date(resetDate.getFullYear(), resetDate.getMonth() + 1, 1, 0, 0, 0, 0);
    const result = await prisma.user.updateMany({
      data: { aiAnalysisUsedThisMonth: 0, aiAnalysisResetDate: nextReset },
    });
    logger.info('Monthly AI usage counters reset', { usersUpdated: result.count });
  } catch (err) {
    logger.error('AI usage reset job error', { error: err });
  }
}
