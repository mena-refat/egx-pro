import { getCache, setCache } from './redis.ts';
import { logger } from './logger.ts';
import { getAnalysisSessionDateString } from './cairo-date.ts';

export type AnalysisMode = 'beginner' | 'professional';

function getCacheTTL(): number {
  return 48 * 60 * 60;
}

function singleKey(ticker: string, mode: AnalysisMode = 'beginner'): string {
  const sessionDate = getAnalysisSessionDateString();
  const modeTag = mode === 'professional' ? ':pro' : '';
  return `ai:single:${ticker.toUpperCase()}:${sessionDate}${modeTag}`;
}

function compareKey(t1: string, t2: string, mode: AnalysisMode = 'beginner'): string {
  const sessionDate = getAnalysisSessionDateString();
  const sorted = [t1, t2].sort().join('_');
  const modeTag = mode === 'professional' ? ':pro' : '';
  return `ai:compare:${sorted}:${sessionDate}${modeTag}`;
}

function personalKey(userId: number, ticker: string, mode: AnalysisMode = 'beginner'): string {
  const sessionDate = getAnalysisSessionDateString();
  const modeTag = mode === 'professional' ? ':pro' : '';
  return `ai:personal:${userId}:${ticker.toUpperCase()}:${sessionDate}${modeTag}`;
}

function personalCompareKey(userId: number, t1: string, t2: string, mode: AnalysisMode = 'beginner'): string {
  const sessionDate = getAnalysisSessionDateString();
  const sorted = [t1, t2].sort().join('_');
  const modeTag = mode === 'professional' ? ':pro' : '';
  return `ai:personal:${userId}:compare:${sorted}:${sessionDate}${modeTag}`;
}

export async function getCachedAnalysis<T>(key: string): Promise<T | null> {
  try {
    const cached = await getCache<{ data: T; cachedAt: string; provider: string }>(key);
    if (cached?.data) {
      logger.info('Analysis cache HIT', { key });
      return cached.data;
    }
  } catch {
    // cache miss
  }
  return null;
}

export async function setCachedAnalysis<T>(key: string, data: T, provider: string): Promise<void> {
  try {
    await setCache(key, { data, cachedAt: new Date().toISOString(), provider }, getCacheTTL());
    logger.info('Analysis cached', { key, ttlSeconds: getCacheTTL() });
  } catch {
    // non-critical
  }
}

export { singleKey, compareKey, personalKey, personalCompareKey };
