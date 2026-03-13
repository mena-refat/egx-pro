/**
 * Standardized API error parsing and user-facing messages.
 * Use for errors rejected by the API client (envelope { ok: false, error, message?, details? } or Axios).
 */
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const ERROR_MAP: Record<string, string> = {
  UNAUTHORIZED: 'errors.unauthorized',
  RATE_LIMIT_EXCEEDED: 'errors.rateLimit',
  VALIDATION_ERROR: 'errors.validation',
  PORTFOLIO_LIMIT_REACHED: 'errors.portfolioLimit',
  WATCHLIST_LIMIT_REACHED: 'errors.watchlistLimit',
  ANALYSIS_LIMIT_REACHED: 'errors.analysisLimit',
  DAILY_LIMIT_EXCEEDED: 'errors.dailyLimit',
  INTERNAL_ERROR: 'errors.internal',
  GOAL_LIMIT_REACHED: 'apiErrors.GOAL_LIMIT_REACHED',
  PLAN_LIMIT_REACHED: 'apiErrors.PLAN_LIMIT_REACHED',
};

export interface ApiErrorPayload {
  errorCode: string;
  message?: string;
  details?: unknown;
}

function isEnvelope(
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

function parseApiErrorRaw(err: unknown): ApiErrorPayload | null {
  if (isEnvelope(err)) {
    return { errorCode: err.error, message: err.message, details: err.details };
  }
  const ax = err as { response?: { data?: { error?: string; message?: string } } };
  if (ax?.response?.data && typeof ax.response.data === 'object' && 'error' in ax.response.data) {
    return {
      errorCode: (ax.response.data as { error?: string }).error ?? 'INTERNAL_ERROR',
      message: (ax.response.data as { message?: string }).message,
    };
  }
  return null;
}

/**
 * Returns error state, handleError, clearError, plus getMessage/parse/getErrorMessage.
 */
export function useApiError() {
  const { t } = useTranslation('common');
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(
    (err: unknown) => {
      const parsed = parseApiErrorRaw(err);
      if (parsed) {
        const key = ERROR_MAP[parsed.errorCode];
        const msg = parsed.message ?? (key ? t(key) : t('errors.internal'));
        setError(msg);
      } else {
        setError(t('errors.internal'));
      }
    },
    [t]
  );

  const clearError = useCallback(() => setError(null), []);

  const getMessage = useCallback(
    (errorCode: string, fallback?: string): string => {
      const key = ERROR_MAP[errorCode] ?? `apiErrors.${errorCode}`;
      return t(key, { defaultValue: fallback ?? t('common.error') });
    },
    [t]
  );

  const getErrorMessage = useCallback(
    (err: unknown): string => {
      const parsed = parseApiErrorRaw(err);
      if (parsed) return getMessage(parsed.errorCode, parsed.message);
      return (err as Error)?.message ?? t('common.error');
    },
    [getMessage, t]
  );

  return {
    error,
    handleError,
    clearError,
    getMessage,
    parse: (err: unknown) => parseApiErrorRaw(err),
    getErrorMessage,
  };
}

export { parseApiErrorRaw as parseApiError };
