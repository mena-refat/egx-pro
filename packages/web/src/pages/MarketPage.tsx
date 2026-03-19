import React, { useMemo, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Moon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { MarketIndicesGrid } from '../components/features/market/MarketIndicesGrid';
import { MarketPageHeader } from '../components/features/market/MarketPageHeader';
import { MarketForexCommodities } from '../components/features/market/MarketForexCommodities';
import { MarketGainersLosers } from '../components/features/market/MarketGainersLosers';
import { MarketNewsSection } from '../components/features/market/MarketNewsSection';
import { useMarketPage } from '../hooks/useMarketPage';
import { minutesAgo } from '../components/features/market/utils';

export default function MarketPage() {
  const { t, i18n } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const isPro = user?.plan === 'pro' || user?.plan === 'yearly';
  const isAr = i18n.language.startsWith('ar');

  const {
    overview,
    stocks,
    news,
    newsFilter,
    setNewsFilter,
    loadingOverview,
    loadingStocks,
    loadingNews,
    refreshing,
    error,
    refreshAll,
  } = useMarketPage();

  const lastUpdateTs = overview?.lastUpdated ?? 0;
  const updatedMinutes = lastUpdateTs ? minutesAgo(lastUpdateTs) : 0;
  const updatedLabel = updatedMinutes === 0 ? t('market.updatedNow') : t('market.updatedAgo', { m: updatedMinutes });

  const topGainers = useMemo(
    () =>
      [...stocks]
        .filter((s) => s.changePercent != null && Number.isFinite(s.changePercent))
        .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
        .slice(0, 10),
    [stocks]
  );

  const topLosers = useMemo(
    () =>
      [...stocks]
        .filter((s) => s.changePercent != null && Number.isFinite(s.changePercent))
        .sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0))
        .slice(0, 10),
    [stocks]
  );

  const indices = useMemo(
    () => [
      { key: 'egx30', label: t('market.egx30'), data: overview?.egx30, icon: null },
      { key: 'egx30Capped', label: t('market.egx30Capped'), data: overview?.egx30Capped, icon: null },
      { key: 'egx70', label: t('market.egx70'), data: overview?.egx70, icon: null },
      { key: 'egx100', label: t('market.egx100'), data: overview?.egx100, icon: null },
      { key: 'egx33', label: t('market.egx33Sharia'), data: overview?.egx33, icon: Moon },
      { key: 'egx35', label: t('market.egx35lv'), data: overview?.egx35, icon: null },
    ],
    [overview, t]
  );

  const dir = isAr ? 'rtl' : 'ltr';

  if (loadingOverview && !overview) {
    return (
      <div className="grid grid-cols-2 gap-3 p-4" dir={dir}>
        {[1, 2, 3, 4].map((i) => (
          <Fragment  key={i}>

            <Skeleton height={96} className="w-full rounded-xl" />
          </Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={dir}>
      <MarketPageHeader isPro={isPro} isAr={isAr} refreshing={refreshing} onRefresh={refreshAll} />

      {error && (
        <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-[var(--danger)]">{error}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => refreshAll()}
          >
            {t('common.retry')}
          </Button>
        </div>
      )}

      <MarketIndicesGrid
        indices={indices}
        loading={loadingOverview}
        title={t('market.egyptIndices')}
        lastUpdatedLabel={updatedLabel}
        lastUpdatedPrefix={t('market.lastUpdated')}
      />

      <section>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">{t('market.forexCommodities')}</h2>
        <MarketForexCommodities overview={overview} loading={loadingOverview} />
      </section>

      <MarketGainersLosers topGainers={topGainers} topLosers={topLosers} loading={loadingStocks} isAr={isAr} />

      <MarketNewsSection news={news} loading={loadingNews} locale={i18n.language} filter={newsFilter} onFilterChange={setNewsFilter} />
    </div>
  );
}
