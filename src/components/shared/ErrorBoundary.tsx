import React from 'react';
import * as Sentry from '@sentry/react';
import { Button } from '../ui/Button';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
          <div className="text-[var(--danger)] text-5xl" aria-hidden>⚠️</div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            حدث خطأ غير متوقع
          </h2>
          <p className="text-[var(--text-secondary)] text-sm text-center max-w-sm">
            {error?.message || 'يرجى المحاولة مرة أخرى'}
          </p>
          <Button type="button" variant="primary" size="md" onClick={resetError}>
            إعادة المحاولة
          </Button>
        </div>
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
