import React from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { FILTERS, SECTOR_OPTIONS } from '../../../hooks/useStockScreener';
import type { FilterId, SortId } from '../../../hooks/useStockScreener';
import type { TFunction } from 'i18next';

interface StockFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  filter: FilterId;
  onFilterChange: (v: FilterId) => void;
  sector: string;
  onSectorChange: (v: string) => void;
  sort: SortId;
  onSortChange: (v: SortId) => void;
  isPro: boolean;
  isAr: boolean;
  t: TFunction;
}

const SORTS: { id: SortId; labelKey: string }[] = [
  { id: 'ticker',  labelKey: 'stocks.sortByTicker'  },
  { id: 'price',   labelKey: 'stocks.sortByPrice'   },
  { id: 'change',  labelKey: 'stocks.sortByChange'  },
  { id: 'volume',  labelKey: 'stocks.sortByVolume'  },
];

export function StockFilters({
  search, onSearchChange,
  filter, onFilterChange,
  sector, onSectorChange,
  sort, onSortChange,
  isAr, t,
}: StockFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('stocks.searchPlaceholder')}
          className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)]/50 transition-colors"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilterChange(f.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
              ${filter === f.id
                ? 'bg-[var(--brand)] text-white shadow-sm'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border)]'
              }`}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {/* Sector + Sort */}
      <div className="flex gap-2">
        {/* Sector */}
        <div className="relative flex-1">
          <select
            value={sector}
            onChange={(e) => onSectorChange(e.target.value)}
            className="w-full appearance-none ps-3 pe-8 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)]/50 transition-colors cursor-pointer"
          >
            {SECTOR_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {isAr ? s.labelAr : s.labelEn}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute end-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
        </div>

        {/* Sort */}
        <div className="relative flex-1">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortId)}
            className="w-full appearance-none ps-3 pe-8 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)]/50 transition-colors cursor-pointer"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {t(s.labelKey)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute end-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
