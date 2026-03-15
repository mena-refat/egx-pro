/**
 * Standard API response helpers — كل الاستجابات تتبع { ok, data } أو { ok: false, error }.
 */
import type { Response } from 'express';

/** Send successful JSON response { ok: true, data }. */
export function sendSuccess<T>(res: Response, data: T, status = 200): void {
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
