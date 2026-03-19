import { ONE_DAY_MS, ONE_MINUTE_MS } from './time.ts';

export const IDEMPOTENCY = {
  header: 'Idempotency-Key',
  ttlMs: ONE_DAY_MS,
  lockTimeoutMs: 2 * ONE_MINUTE_MS,
  minKeyLength: 8,
  maxKeyLength: 128,
} as const;
