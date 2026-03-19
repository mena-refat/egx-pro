/**
 * API contract types — shared between server and client.
 * كل استجابة ناجحة: { ok: true, data: T }
 * كل استجابة خطأ: { ok: false, error: string, message?: string, details?: unknown }
 */

export type ApiResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; message?: string; details?: unknown };

export type PaginatedResponse<T> = {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

/** Type guard for API error shape (client-side). */
export function isApiError(
  value: unknown
): value is { ok: false; error: string; message?: string; details?: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    (value as { ok: unknown }).ok === false &&
    'error' in value &&
    typeof (value as { error: unknown }).error === 'string'
  );
}
