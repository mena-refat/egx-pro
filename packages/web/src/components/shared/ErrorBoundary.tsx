import React from 'react';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react';
import { Button } from '../ui/Button';
import styles from './ErrorBoundary.module.scss';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/** Never expose error.message to users — Sentry captures the full error. */
function ErrorFallback({ resetError }: { resetError: () => void }) {
  const { t } = useTranslation('common');
  return (
    <div className={styles.root}>
      <div className={styles.emoji} aria-hidden>⚠️</div>
      <h2 className={styles.title}>{t('errorBoundary.title')}</h2>
      <p className={styles.description}>{t('errorBoundary.description')}</p>
      <Button type="button" variant="primary" size="md" onClick={resetError}>
        {t('errorBoundary.retry')}
      </Button>
    </div>
  );
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}>
      {children}
    </Sentry.ErrorBoundary>
  );
}
