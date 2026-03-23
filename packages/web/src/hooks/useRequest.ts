import { useState, useRef, useCallback } from 'react';

// ─── Error extraction ────────────────────────────────────────────────────────
// Normalises the many shapes an error can arrive in (Axios, fetch, plain Error,
// API envelope) into a single string code so callers never need to inspect.
function extractErrorCode(err: unknown): string {
  if (!err || typeof err !== 'object') {
    return err instanceof Error ? err.message : 'UNKNOWN_ERROR';
  }
  const e = err as Record<string, unknown>;

  // Axios response error  →  { response: { data: { error: 'CODE' } } }
  if (e.response && typeof e.response === 'object') {
    const r = e.response as Record<string, unknown>;
    if (r.data && typeof r.data === 'object') {
      const d = r.data as Record<string, unknown>;
      if (typeof d.error === 'string') return d.error;
    }
    if (typeof r.status === 'number') return `HTTP_${r.status}`;
  }

  // Already-unwrapped API envelope  →  { ok: false, error: 'CODE' }
  if (typeof e.error === 'string') return e.error;
  if (typeof e.message === 'string') return e.message;

  return 'UNKNOWN_ERROR';
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RequestState {
  loading: boolean;
  error: string | null;
}

export interface UseRequestReturn extends RequestState {
  /**
   * Wrap any async API call. Returns the resolved value or `null` on error.
   * Calls while a previous one is still in-flight are silently ignored
   * (double-click / concurrent call protection).
   */
  run: <T>(fn: () => Promise<T>) => Promise<T | null>;
  /** Clear the stored error without re-running the request. */
  clearError: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Lightweight async-state manager for one-off API calls.
 *
 * Features
 * --------
 * • Tracks `loading` and `error` for you — no more useState boilerplate.
 * • **Double-click safe**: if `run()` is called while a previous call is still
 *   in-flight, the second call is dropped and `null` is returned immediately.
 * • Error is normalised to a string code via `extractErrorCode`.
 * • `loading` is always reset to `false` in a `finally` block — no stale state.
 *
 * Usage
 * -----
 * ```tsx
 * const { loading, error, run } = useRequest();
 *
 * const handleSave = () => run(() => api.post('/items', payload));
 *
 * <Button loading={loading} onClick={handleSave}>Save</Button>
 * ```
 *
 * Multiple independent requests on the same component
 * ---------------------------------------------------
 * ```tsx
 * const save   = useRequest();
 * const delete_ = useRequest();
 * ```
 */
export function useRequest(): UseRequestReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref instead of state so the guard never causes an extra render.
  const inFlight = useRef(false);

  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    // Drop concurrent duplicate calls (double-click protection).
    if (inFlight.current) return null;

    inFlight.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await fn();
      return result;
    } catch (err) {
      setError(extractErrorCode(err));
      return null;
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { loading, error, run, clearError };
}
