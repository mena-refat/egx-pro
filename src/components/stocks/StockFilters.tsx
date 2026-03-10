import React from 'react';
import { Search, Circle, Timer } from 'lucide-react';
import type { FilterId, SortId } from '../../hooks/useStockScreener';
import { FILTERS, SECTOR_OPTIONS } from '../../hooks/useStockScreener';

export interface StockFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: FilterId;
  onFilterChange: (id: FilterId) => void;
  sector: string;
  onSectorChange: (value: string) => void;
  sort: SortId;
  onSortChange: (id: SortId) => void;
  isPro: boolean;
  isAr: boolean;
  t: (key: string) => string;
}

export function StockFilters({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  sector,
  onSectorChange,
  sort,
  onSortChange,
  isPro,
  isAr,
  t,
}: StockFiltersProps) {
  return (
    <>
      <header className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('stocks.title')}</h1>
          {isPro ? (
            <span className="inline-flex items-center gap-1 text-label font-medium text-[var(--success)] px-2 py-0.5 rounded-full bg-[var(--success-bg)]">
              <Circle className="w-3 h-3 fill-[var(--success)]" aria-hidden />
              {t('delay.liveBadge')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-label font-medium text-[var(--text-muted)] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)]">
              <Timer className="w-3 h-3" aria-hidden />
              {t('delay.delayedBadge')}
            </span>
          )}
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] ltr:left-3 rtl:right-3 pointer-events-none"
            aria-hidden
          />
          <input
            type="text"
            placeholder={t('stocks.searchPlaceholder')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-2.5 ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
          />
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilterChange(f.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f.id
                ? 'bg-[var(--brand)] text-[var(--text-inverse)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <span>{t('stocks.sectorLabel')}</span>
          <select
            value={sector}
            onChange={(e) => onSectorChange(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-[var(--text-primary)] min-w-[140px]"
            aria-label={isAr ? 'القطاع' : 'Sector'}
          >
            {SECTOR_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {isAr ? opt.labelAr : opt.labelEn}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span>{t('stocks.sortLabel')}</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortId)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-[var(--text-primary)]"
          >
            <option value="ticker">{t('stocks.sortByTicker')}</option>
            <option value="price">{t('stocks.sortByPrice')}</option>
            <option value="change">{t('stocks.sortByChange')}</option>
            <option value="volume">{t('stocks.sortByVolume')}</option>
          </select>
        </div>
      </div>
    </>
  );
}
