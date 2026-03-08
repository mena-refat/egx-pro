import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

type DataPoint = { value?: number; change?: number; changePercent?: number };
type IndexItem = { key: string; label: string; data?: DataPoint | null; icon: React.ComponentType<{ className?: string }> | null };

function formatValue(n: number, decimals = 2): string {
  if (!Number.isFinite(n) || n === 0) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}

function formatChange(changePercent: number): string {
  if (!Number.isFinite(changePercent)) return '—';
  const sign = changePercent > 0 ? '+' : '';
  return `${sign}${changePercent.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function MiniSparkline({ changePercent }: { changePercent: number }) {
  const up = changePercent >= 0;
  const points = 8;
  const w = 48;
  const h = 24;
  const pad = 2;
  const ys = Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const trend = up ? 1 - t : t;
    const jitter = Math.sin(i * 1.3) * 0.3 + 0.7;
    return pad + (h - pad * 2) * (1 - trend * jitter);
  });
  const path = ys.map((y, i) => `${i === 0 ? 'M' : 'L'} ${(i / (points - 1)) * (w - pad * 2) + pad} ${y}`).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0 opacity-70" aria-hidden>
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} className={up ? 'text-[var(--success)]' : 'text-[var(--danger)]'} />
    </svg>
  );
}

export interface MarketIndicesGridProps {
  indices: IndexItem[];
  loading: boolean;
  title: string;
  lastUpdatedLabel: string;
  lastUpdatedPrefix: string;
}

export function MarketIndicesGrid({ indices, loading, title, lastUpdatedLabel, lastUpdatedPrefix }: MarketIndicesGridProps) {

  if (loading) {
    return (
      <section>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
          <span className="text-xs text-[var(--text-muted)]">{lastUpdatedPrefix}: {lastUpdatedLabel}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-2">
              <Skeleton height={16} className="w-1/3" />
              <Skeleton height={24} className="w-1/2" />
              <Skeleton height={14} className="w-1/4" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
        <span className="text-xs text-[var(--text-muted)]">{lastUpdatedPrefix}: {lastUpdatedLabel}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {indices.map(({ key, label, data, icon: Icon }) => {
          const val = data?.value ?? 0;
          const changeP = data?.changePercent ?? 0;
          const isUp = changeP > 0;
          const isDown = changeP < 0;
          return (
            <div key={key} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                {Icon && <Icon className="w-4 h-4 text-[var(--text-muted)]" />}
                <span className="font-medium text-[var(--text-secondary)]">{label}</span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className="text-lg font-bold text-[var(--text-primary)]">{formatValue(val, 0)}</span>
                <span className={`text-xs font-semibold flex items-center gap-0.5 ${isUp ? 'text-[var(--success)]' : isDown ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
                  {formatChange(changeP)}
                  {isUp && <TrendingUp className="w-3.5 h-3.5" />}
                  {isDown && <TrendingDown className="w-3.5 h-3.5" />}
                </span>
              </div>
              <div className="mt-2 flex justify-end">
                <MiniSparkline changePercent={changeP} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
