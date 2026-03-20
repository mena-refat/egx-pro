import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/Button';
import { Skeleton } from '../../ui/Skeleton';
import type { DashboardMarketOverview as Overview } from './types';

type Props = {
  overview: Overview | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const INDICATOR_KEYS = [
  { key: 'egx30', tKey: 'market.egx30' as const },
  { key: 'egx30Capped', tKey: 'market.egx30Capped' as const },
  { key: 'egx70', tKey: 'market.egx70' as const },
  { key: 'egx100', tKey: 'market.egx100' as const },
  { key: 'usdEgp', tKey: 'market.usdEgp' as const },
  { key: 'egx33', tKey: 'market.egx33Sharia' as const },
  { key: 'egx35', tKey: 'market.egx35lv' as const },
  { key: 'gold', tKey: 'Gold' as const },
] as const;

export function DashboardMarketOverview({ overview, loading, error, onRetry }: Props) {
  const { t } = useTranslation('common');

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 scrollbar-thin">
        {[...Array(5)].map((_, i) => (
          <span key={i} className="shrink-0 inline-block w-36">
            <Skeleton className="h-20 w-full rounded-xl" />
          </span>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center text-[var(--danger)] text-body">
        <p>{error}</p>
        <Button type="button" variant="link" size="sm" onClick={onRetry} className="mt-3">
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  if (!overview) return null;

  const items = INDICATOR_KEYS.map(({ key, tKey }) => {
    const data = key in overview ? overview[key as keyof Overview] : undefined;
    const label = tKey.startsWith('market.') ? t(tKey) : tKey;
    const value =
      typeof data === 'object' && data !== null && 'value' in data
        ? (data as { value: number }).value
        : typeof data === 'number'
          ? data
          : undefined;
    const change =
      typeof data === 'object' && data !== null && 'changePercent' in data
        ? (data as { changePercent: number }).changePercent
        : undefined;
    return { label, value, change };
  });

  return (
    <div className="flex gap-4 min-w-0 overflow-x-auto pb-2 -mx-1 scrollbar-thin">
      {items.map((item, idx) => (
        <div key={idx} className="card-base card-elevated shrink-0 rounded-2xl px-5 py-4 min-w-[140px]">
          <p className="text-label uppercase tracking-wider mb-1">{item.label}</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-body font-number text-[var(--text-primary)]">
              {item.value != null ? Number(item.value).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
            </span>
            {item.change != null && (
              <span className={`text-label font-bold tabular-nums ${item.change >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                {item.change >= 0 ? '+' : ''}{Number(item.change).toFixed(2)}%
              </span>
            )}
          </div>
          <div className={`mt-2 h-1 rounded-full overflow-hidden ${item.change != null && item.change >= 0 ? 'bg-[var(--positive)]/20' : 'bg-[var(--negative)]/20'}`}>
            <div
              className={`h-full w-progress rounded-full ${item.change != null && item.change >= 0 ? 'bg-[var(--positive)]' : 'bg-[var(--negative)]'}`}
              style={{ ['--progress-width']: `${Math.min(100, Math.abs((item.change ?? 0) / 2) + 20)}%` } as React.CSSProperties}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
