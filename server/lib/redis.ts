import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_TOKEN;

export const redis = redisUrl && redisToken 
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

if (!redis) {
  console.warn('⚠️ Upstash Redis credentials missing. Caching will be disabled.');
}

// In-memory fallback
const localCache = new Map<string, { value: unknown; expiry: number }>();
let redisWriteDisabled = false;

export const getCache = async <T>(key: string): Promise<T | null> => {
  // Try Redis first
  if (redis) {
    try {
      return await redis.get<T>(key);
    } catch (err) {
      console.warn(`Redis Get Error [${key}]:`, err);
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

export const setCache = async (key: string, value: unknown, expireSeconds: number): Promise<void> => {
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
      console.warn('⚠️ Redis write permission denied. Disabling Redis writes for this session.');
      redisWriteDisabled = true;
    } else {
      console.warn(`Redis Set Error [${key}]:`, err);
    }
  }
};
