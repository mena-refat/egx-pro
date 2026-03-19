import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

type DataPoint = { value?: number; change?: number; changePercent?: number };
type IndexItem = { key: string; label: string; data?: DataPoint | null; icon: React.ComponentType<{ className?: string }> | null };

function formatValue(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatPct(v: number): string {
  if (!Number.isFinite(v) || v === 0) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function MiniSparkline({ changePercent }: { changePercent: number }) {
  if (changePercent === 0) return <div className="w-10 h-5" />;
  const up = changePercent > 0;
  const pts = 8;
  const w = 40;
  const h = 20;
  const ys = Array.from({ length: pts }, (_, i) => {
    const t = i / (pts - 1);
    const trend = up ? 1 - t : t;
    const wave = Math.sin(i * 1.9 + (up ? 0.3 : 1.0)) * 0.2 + 0.8;
    return 2 + (h - 4) * (1 - trend * wave);
  });
  const d = ys.map((y, i) => `${i === 0 ? 'M' : 'L'}${(i / (pts - 1)) * (w - 4) + 2},${y}`).join('');
  const fill = `${d}L${w - 2},${h - 2}L2,${h - 2}Z`;
  const color = up ? 'var(--success)' : 'var(--danger)';
  return (
    <svg width={w} height={h} aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={`s-${up ? 'u' : 'd'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#s-${up ? 'u' : 'd'})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IndexCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-3 animate-pulse flex flex-col gap-2">
      <div className="h-2.5 w-14 rounded-full bg-[var(--bg-card-hover)]" />
      <div className="h-5 w-20 rounded bg-[var(--bg-card-hover)]" />
      <div className="h-4 w-12 rounded-full bg-[var(--bg-card-hover)]" />
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
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
        <span className="text-[11px] text-[var(--text-muted)]">
          {lastUpdatedPrefix}:{' '}
          <span className="text-[var(--text-secondary)]">{lastUpdatedLabel}</span>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {loading
          ? [...Array(6)].map((_, i) => <IndexCardSkeleton key={i} />)
          : indices.map(({ key, label, data, icon: Icon }) => {
              const val = data?.value ?? 0;
              const changeP = data?.changePercent ?? 0;
              const isUp = changeP > 0;
              const isDown = changeP < 0;

              return (
                <div
                  key={key}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-3 flex flex-col gap-1.5 hover:border-[var(--border-strong)] transition-colors"
                >
                  {/* Label */}
                  <div className="flex items-center gap-1 min-w-0">
                    {Icon && <Icon className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />}
                    <span className="text-xs font-bold text-[var(--text-primary)] truncate leading-none">
                      {label}
                    </span>
                  </div>

                  {/* Value + sparkline */}
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-base font-bold tabular-nums leading-none ${val ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                      {formatValue(val)}
                    </span>
                    <MiniSparkline changePercent={changeP} />
                  </div>

                  {/* Change badge */}
                  <span
                    className={`inline-flex items-center gap-0.5 self-start text-[10px] font-bold px-1.5 py-0.5 rounded-md
                      ${isUp ? 'bg-[var(--success)]/10 text-[var(--success)]' : isDown ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}
                  >
                    {isUp && <TrendingUp className="w-2.5 h-2.5" />}
                    {isDown && <TrendingDown className="w-2.5 h-2.5" />}
                    {formatPct(changeP)}
                  </span>
                </div>
              );
            })}
      </div>
    </section>
  );
}
