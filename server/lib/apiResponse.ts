/**
 * Standard API response helpers — كل الاستجابات تتبع { ok, data } أو { ok: false, error }.
 */
import type { Response } from 'express';

/** Send successful JSON response { ok: true, data }. */
export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ ok: true as const, data });
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
