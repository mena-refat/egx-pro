/**
 * In-memory GET cache for frequently accessed API data.
 * Use for: market overview, bulk prices, user profile, achievements.
 */

import api from './api';

const cache = new Map<string, { data: unknown; expiry: number }>();

export async function cachedGet<T>(url: string, ttlMs = 30_000): Promise<T> {
  const c = cache.get(url);
  if (c && Date.now() < c.expiry) return c.data as T;
  const res = await api.get(url);
  const data = res.data as T;
  cache.set(url, { data, expiry: Date.now() + ttlMs });
  return data;
}

export function invalidateCache(urlOrPrefix: string): void {
  if (urlOrPrefix.endsWith('*') || urlOrPrefix.includes('*')) {
    const prefix = urlOrPrefix.replace(/\*$/, '');
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  } else {
    cache.delete(urlOrPrefix);
  }
}

/** Clear entire cache or all keys matching prefix (no wildcard). */
export function clearCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
