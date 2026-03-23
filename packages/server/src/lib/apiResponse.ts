/**
 * Standard API response helpers — كل الاستجابات تتبع { ok, data } أو { ok: false, error }.
 */
import type { Response } from 'express';

/** Send successful JSON response { ok: true, data }. */
export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ ok: true as const, data });
}

export type SendSuccessCacheOptions = {
  maxAgeSec: number;
  scope: 'public' | 'private';
  /** e.g. "Authorization, Cookie" when the same path can differ by user */
  vary?: string;
};

/** Success response with Cache-Control (only after you know status is 200). */
export function sendSuccessCached<T>(
  res: Response,
  data: T,
  options: SendSuccessCacheOptions,
  status = 200
): void {
  const { maxAgeSec, scope, vary } = options;
  const swr = Math.min(Math.max(5, Math.floor(maxAgeSec * 1.5)), 180);
  res.setHeader('Cache-Control', `${scope}, max-age=${maxAgeSec}, stale-while-revalidate=${swr}`);
  if (vary) res.setHeader('Vary', vary);
  res.status(status).json({ ok: true as const, data });
}

export function sendStoredSuccess<T>(
  res: Response,
  body: { ok: true; data: T },
  status = 200,
  replayed = false
): void {
  res.set('Idempotency-Replayed', replayed ? 'true' : 'false');
  res.status(status).json(body);
}

/** Send error JSON response { ok: false, error, message?, details? }. */
export function sendError(
  res: Response,
  error: string,
  status = 400,
  message?: string,
  details?: unknown
): void {
  res.status(status).json({
    ok: false as const,
    error,
    ...(message && { message }),
    ...(details !== undefined && { details }),
  });
}
