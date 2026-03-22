import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Timer, ChevronLeft } from 'lucide-react';
import { Button } from '../../ui/Button';

type Props = {
  isPro: boolean;
  isAr: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

export function MarketPageHeader({ isPro, isAr, refreshing, onRefresh }: Props) {
  const { t } = useTranslation('common');

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-[var(--bg-secondary)] p-6 sm:p-8">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-[var(--brand)]/8 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-emerald-500/6 blur-2xl" aria-hidden />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {t('market.title')}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            {isPro ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                {t('market.allPricesLive')}
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
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

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={t('market.refresh')}
          className="shrink-0 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
        </button>
      </div>
    </div>
  );
}
