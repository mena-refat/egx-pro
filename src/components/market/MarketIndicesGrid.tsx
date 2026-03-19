import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type DataPoint = { value?: number; change?: number; changePercent?: number };
type IndexItem = { key: string; label: string; data?: DataPoint | null; icon: React.ComponentType<{ className?: string }> | null };

function formatValue(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatChange(v: number): string {
  if (!Number.isFinite(v)) return '—';
  return `${v > 0 ? '+' : ''}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatAbsChange(v: number): string {
  if (!Number.isFinite(v) || v === 0) return '';
  return `${v > 0 ? '+' : ''}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function MiniSparkline({ changePercent }: { changePercent: number }) {
  const up = changePercent >= 0;
  const pts = 10;
  const w = 64;
  const h = 28;
  const pad = 3;
  const ys = Array.from({ length: pts }, (_, i) => {
    const t = i / (pts - 1);
    const trend = up ? 1 - t : t;
    const jitter = Math.sin(i * 1.7 + (up ? 0.5 : 1.2)) * 0.25 + 0.75;
    return pad + (h - pad * 2) * (1 - trend * jitter);
  });
  const path = ys.map((y, i) => `${i === 0 ? 'M' : 'L'}${(i / (pts - 1)) * (w - pad * 2) + pad},${y}`).join(' ');
  const fillPath = `${path} L${w - pad},${h - pad} L${pad},${h - pad} Z`;
  const color = up ? 'var(--success)' : 'var(--danger)';
  return (
    <svg width={w} height={h} aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={`sg-${up ? 'up' : 'dn'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#sg-${up ? 'up' : 'dn'})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IndexCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-3 animate-pulse">
      <div className="h-3 w-20 rounded-full bg-[var(--bg-card-hover)]" />
      <div className="h-7 w-28 rounded-lg bg-[var(--bg-card-hover)]" />
      <div className="flex items-center justify-between">
        <div className="h-3 w-14 rounded-full bg-[var(--bg-card-hover)]" />
        <div className="h-7 w-16 rounded bg-[var(--bg-card-hover)]" />
      </div>
    </div>
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
  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
        <span className="text-xs text-[var(--text-muted)]">
          {lastUpdatedPrefix}: <span className="font-medium text-[var(--text-secondary)]">{lastUpdatedLabel}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {loading
          ? [...Array(6)].map((_, i) => <IndexCardSkeleton key={i} />)
          : indices.map(({ key, label, data, icon: Icon }) => {
              const val = data?.value ?? 0;
              const changeP = data?.changePercent ?? 0;
              const changeAbs = data?.change ?? 0;
              const isUp = changeP > 0;
              const isDown = changeP < 0;
              const colorClass = isUp
                ? 'text-[var(--success)]'
                : isDown
                ? 'text-[var(--danger)]'
                : 'text-[var(--text-muted)]';
              const bgClass = isUp
                ? 'bg-[var(--success)]/8'
                : isDown
                ? 'bg-[var(--danger)]/8'
                : 'bg-[var(--bg-secondary)]';

              return (
                <div
                  key={key}
                  className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 overflow-hidden transition-shadow hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]"
                >
                  {/* Label row */}
                  <div className="flex items-center gap-1.5 mb-3">
                    {Icon && <Icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide leading-none">
                      {label}
                    </span>
                  </div>

                  {/* Value */}
                  <p className="text-2xl font-bold text-[var(--text-primary)] leading-none tabular-nums mb-3">
                    {formatValue(val)}
                  </p>

                  {/* Bottom: change pill + sparkline */}
                  <div className="flex items-end justify-between gap-2">
                    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${bgClass} ${colorClass}`}>
                      {isUp && <TrendingUp className="w-3 h-3" />}
                      {isDown && <TrendingDown className="w-3 h-3" />}
                      {!isUp && !isDown && <Minus className="w-3 h-3" />}
                      <span>{formatChange(changeP)}</span>
                    </div>

                    <MiniSparkline changePercent={changeP} />
                  </div>

                  {/* Abs change */}
                  {changeAbs !== 0 && (
                    <p className={`text-[10px] font-medium mt-1.5 ${colorClass} opacity-70`}>
                      {formatAbsChange(changeAbs)} pts
                    </p>
                  )}
                </div>
              );
            })}
      </div>
    </section>
  );
}
