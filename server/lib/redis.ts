import { Redis } from '@upstash/redis';
import { logger } from './logger.ts';

const redisUrl = process.env.UPSTASH_REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_TOKEN;

export const redis = redisUrl && redisToken 
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

if (!redis) {
  logger.warn('⚠️ Upstash Redis credentials missing. Caching will be disabled.');
}

// In-memory fallback
const localCache = new Map<string, { value: unknown; expiry: number }>();
let redisWriteDisabled = false;
const LOCAL_CACHE_MAX_SIZE = 2000;

/** Get value from Redis or in-memory fallback. Returns null if missing or expired. */
export const getCache = async <T>(key: string): Promise<T | null> => {
  // Try Redis first
  if (redis) {
    try {
      return await redis.get<T>(key);
    } catch (err) {
      logger.warn('Redis Get Error', { key, err });
      // Fallback to local cache on error
    }
  }

  // Check local cache
  const cached = localCache.get(key);
  if (cached) {
    if (Date.now() < cached.expiry) {
      return cached.value as T;
    } else {
      localCache.delete(key);
    }
  }
  
  return null;
};

/** Set value in Redis and in-memory cache with TTL in seconds. */
export const setCache = async (key: string, value: unknown, expireSeconds: number): Promise<void> => {
  // Evict oldest entry if we are at capacity and inserting a new key
  if (!localCache.has(key) && localCache.size >= LOCAL_CACHE_MAX_SIZE) {
    const firstKey = localCache.keys().next().value;
    if (firstKey !== undefined) localCache.delete(firstKey);
  }

  // Always set local cache as backup
  localCache.set(key, {
    value,
    expiry: Date.now() + (expireSeconds * 1000)
  });

  if (!redis || redisWriteDisabled) return;
  
  try {
    await redis.set(key, value, { ex: expireSeconds });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('NOPERM')) {
      logger.warn('⚠️ Redis write permission denied. Disabling Redis writes for this session.');
      redisWriteDisabled = true;
    } else {
      logger.warn('Redis Set Error', { key, err });
    }
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  localCache.delete(key);
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    logger.warn('Redis Del Error', { key, err });
  }
};

/** Increment key by 1, return new value. Optionally set expiry at Unix timestamp (seconds). */
export const incrWithExpire = async (key: string, expireAtUnixSeconds?: number): Promise<number> => {
  if (!redis) return 0;
  try {
    const count = await redis.incr(key);
    if (expireAtUnixSeconds != null && count === 1) {
      await redis.expireat(key, expireAtUnixSeconds);
    }
    return count;
  } catch (err) {
    logger.warn('Redis Incr Error', { key, err });
    return 0;
  }
};

/** Get integer value of key. */
export const getCount = async (key: string): Promise<number> => {
  if (!redis) return 0;
  try {
    const val = await redis.get<number>(key);
    return typeof val === 'number' ? val : 0;
  } catch (err) {
    logger.warn('Redis Get Error', { key, err });
    return 0;
  }
};

/** Decrement key by 1; do not go below 0. Returns new value. */
export const decrCount = async (key: string): Promise<number> => {
  if (!redis) return 0;
  try {
    const val = await redis.decr(key);
    return val < 0 ? 0 : val;
  } catch (err) {
    logger.warn('Redis Decr Error', { key, err });
    return 0;
  }
};
