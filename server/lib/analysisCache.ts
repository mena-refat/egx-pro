/**
 * Shared Analysis Cache — يوفّر 70-85% من tokens
 *
 * الفكرة: تحليل سهم COMI الساعة 10 صباحاً = نفس تحليل COMI الساعة 11
 * فبنحفظ النتيجة في Redis ونرجعها لكل مستخدم يسأل عن نفس السهم
 *
 * TTL ذكي:
 * - السوق مفتوح: 2 ساعة (الأسعار بتتغير)
 * - السوق مقفل: 8 ساعات (مفيش تغيير)
 * - ويكند: 12 ساعة
 */
import { getCache, setCache } from './redis.ts';
import { getMarketStatus } from './marketHours.ts';
import { logger } from './logger.ts';

function getCacheTTL(): number {
  const status = getMarketStatus();
  switch (status.status) {
    case 'open':
    case 'pre':
    case 'auction':
      return 2 * 60 * 60; // ساعتين — السوق مفتوح
    case 'closing':
    case 'closed':
      return 8 * 60 * 60; // 8 ساعات — السوق مقفل
    default:
      return 12 * 60 * 60; // 12 ساعة — ويكند/أجازة
  }
}

// ══ Cache Keys ══
function singleKey(ticker: string): string {
  const today = new Date().toISOString().slice(0, 10); // 2026-03-14
  return `ai:single:${ticker.toUpperCase()}:${today}`;
}

function compareKey(t1: string, t2: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [t1, t2].sort().join('_'); // ABUK_COMI (always same order)
  return `ai:compare:${sorted}:${today}`;
}

// لا cache للتوصيات — لأنها شخصية (تعتمد على محفظة المستخدم)

// ══ Get / Set ══
export async function getCachedAnalysis<T>(key: string): Promise<T | null> {
  try {
    const cached = await getCache<{ data: T; cachedAt: string; provider: string }>(key);
    if (cached?.data) {
      logger.info('Analysis cache HIT', { key });
      return cached.data;
    }
  } catch {
    // cache miss — fine
  }
  return null;
}

export async function setCachedAnalysis<T>(key: string, data: T, provider: string): Promise<void> {
  const ttl = getCacheTTL();
  try {
    await setCache(key, { data, cachedAt: new Date().toISOString(), provider }, ttl);
    logger.info('Analysis cached', { key, ttlSeconds: ttl });
  } catch {
    // non-critical
  }
}

export { singleKey, compareKey };
