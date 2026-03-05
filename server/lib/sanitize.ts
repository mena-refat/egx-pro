import type { Request, Response, NextFunction } from 'express';
import xss from 'xss';

/**
 * Strip HTML/script and trim string inputs for security.
 */
function cleanString(value: unknown): string {
  if (value == null) return '';
  const s = String(value).trim();
  return xss(s, { stripIgnoreTag: true, stripIgnoreTagBody: ['script'] });
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return cleanString(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeValue(v);
    }
    return out;
  }
  return value;
}

/**
 * Middleware: sanitize req.body, req.query, req.params (strings only).
 */
export function sanitizeInput(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeValue(req.body) as typeof req.body;
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeValue(req.query) as typeof req.query;
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeValue(req.params) as typeof req.params;
    }
  } catch (_e) {
    // لو فشل التعقيم لا نكسر الطلب
  }
  next();
}
