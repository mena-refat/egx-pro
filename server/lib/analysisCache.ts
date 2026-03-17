import { getCache, setCache } from './redis.ts';
import { logger } from './logger.ts';
import { getAnalysisSessionDateString } from './cairo-date.ts';

function getCacheTTL(): number {
  return 48 * 60 * 60;
}

function singleKey(ticker: string): string {
  const sessionDate = getAnalysisSessionDateString();
  return `ai:single:${ticker.toUpperCase()}:${sessionDate}`;
}

function compareKey(t1: string, t2: string): string {
  const sessionDate = getAnalysisSessionDateString();
  const sorted = [t1, t2].sort().join('_');
  return `ai:compare:${sorted}:${sessionDate}`;
}

function personalKey(userId: string, ticker: string): string {
  const sessionDate = getAnalysisSessionDateString();
  return `ai:personal:${userId}:${ticker.toUpperCase()}:${sessionDate}`;
}

function personalCompareKey(userId: string, t1: string, t2: string): string {
  const sessionDate = getAnalysisSessionDateString();
  const sorted = [t1, t2].sort().join('_');
  return `ai:personal:${userId}:compare:${sorted}:${sessionDate}`;
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
