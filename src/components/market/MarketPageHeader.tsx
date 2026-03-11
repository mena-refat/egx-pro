import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Circle, Timer, ChevronLeft } from 'lucide-react';
import { Button } from '../ui/Button';

type Props = {
  isPro: boolean;
  isAr: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

export function MarketPageHeader({ isPro, isAr, refreshing, onRefresh }: Props) {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('market.title')}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
          {isPro ? (
            <span className="inline-flex items-center gap-1 text-[var(--success)]">
              <Circle className="w-3.5 h-3.5 fill-[var(--success)]" aria-hidden />
              {t('market.allPricesLive')}
            </span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1">
                <Timer className="w-3.5 h-3.5" aria-hidden />
                {t('market.stocksDelayed10')}
              </span>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-subscription'))}
                className="inline-flex items-center gap-0.5 text-[var(--brand)]"
              >
                {t('market.upgradeToLivePrices')}
                <ChevronLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} aria-hidden />
              </Button>
            </>
          )}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        icon={<RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />}
        className="self-start sm:self-center p-2 min-w-0"
        aria-label={t('market.refresh')}
      >
        <span className="sr-only">{t('market.refresh')}</span>
      </Button>
    </div>
  );
}
