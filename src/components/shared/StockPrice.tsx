import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import type { QuoteResult } from '../../hooks/useStockQuote';

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
      <div className={`animate-pulse rounded bg-[var(--bg-secondary)] ${size === 'lg' ? 'h-10 w-32' : size === 'sm' ? 'h-6 w-20' : 'h-8 w-24'} ${className}`.trim()} />
    );
  }

  if (error && !quote) {
    return (
      <span className={`text-[var(--danger)] text-body ${className}`.trim()}>
        {error}
      </span>
    );
  }

  if (!quote) return null;

  const price = quote.price ?? 0;
  const change = quote.change ?? 0;
  const changePercent = quote.changePercent ?? 0;
  const isPositive = change >= 0;
  const isZero = change === 0;

  const sizeClasses = {
    sm: 'text-body',
    md: 'text-body font-semibold',
    lg: 'text-xl font-bold',
  };

  return (
    <div className={`flex flex-col gap-0.5 ${className}`.trim()}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`font-number tabular-nums text-[var(--text-primary)] ${sizeClasses[size]}`}>
          {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-[var(--text-muted)] ms-1 font-normal">EGP</span>
        </span>
        {!isZero && (
          <span
            className={`inline-flex items-center font-number tabular-nums font-semibold ${
              isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
            }`}
          >
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        )}
        {quote.stale && (
          <span className="inline-flex items-center gap-1 text-[var(--warning)]" title={t('delay.staleWarning')}>
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
          </span>
        )}
      </div>
      {showDelayedBadge && (
        <span className="text-xs text-[var(--text-muted)]">
          {t('delay.delayedBadge20')}
        </span>
      )}
    </div>
  );
}
