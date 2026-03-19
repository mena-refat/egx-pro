import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import type { QuoteResult } from '../../hooks/useStockQuote';
import styles from './StockPrice.module.scss';

interface StockPriceProps {
  quote: QuoteResult | null;
  loading?: boolean;
  error?: string | null;
  /** Show "Delayed 20 min" badge (default true) */
  showDelayedBadge?: boolean;
  /** Size: 'sm' | 'md' | 'lg' */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StockPrice({
  quote,
  loading = false,
  error = null,
  showDelayedBadge = true,
  size = 'md',
  className = '',
}: StockPriceProps) {
  const { t } = useTranslation('common');

  if (loading && !quote) {
    return (
      <div
        className={clsx(styles.skeleton, styles.skeletonPulse, styles[size], className)}
        aria-hidden
      />
    );
  }

  if (error && !quote) {
    return <span className={clsx(styles.error, className)}>{error}</span>;
  }

  if (!quote) return null;

  const price = quote.price ?? 0;
  const change = quote.change ?? 0;
  const changePercent = quote.changePercent ?? 0;
  const isPositive = change >= 0;
  const isZero = change === 0;

  return (
    <div className={clsx(styles.root, className)}>
      <div className={styles.row}>
        <span className={clsx(styles.price, styles[size])}>
          {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className={styles.currency}>EGP</span>
        </span>
        {!isZero && (
          <span className={clsx(styles.change, isPositive ? styles.positive : styles.negative)}>
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        )}
        {quote.stale && (
          <span className={styles.staleWrap} title={t('delay.staleWarning')}>
            <AlertTriangle className={styles.staleIcon} aria-hidden />
          </span>
        )}
      </div>
      {showDelayedBadge && <span className={styles.delayedBadge}>{t('delay.delayedBadge20')}</span>}
    </div>
  );
}
