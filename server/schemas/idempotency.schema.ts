import { z } from 'zod';
import { IDEMPOTENCY } from '../lib/constants.ts';

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(IDEMPOTENCY.minKeyLength)
  .max(IDEMPOTENCY.maxKeyLength)
  .regex(/^[A-Za-z0-9:_-]+$/);
