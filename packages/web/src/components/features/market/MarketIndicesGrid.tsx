import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

type DataPoint = { value?: number; change?: number; changePercent?: number };
type IndexItem = { key: string; label: string; data?: DataPoint | null; icon: React.ComponentType<{ className?: string }> | null };

function formatValue(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '-';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatPct(v: number): string {
  if (!Number.isFinite(v) || v === 0) return '-';
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-4 animate-pulse flex flex-col gap-2.5">
      <div className="h-2.5 w-16 rounded-full bg-[var(--bg-card-hover)]" />
      <div className="h-6 w-24 rounded bg-[var(--bg-card-hover)]" />
      <div className="h-4 w-14 rounded-full bg-[var(--bg-card-hover)]" />
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
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-full border border-[var(--border)]">
          <Clock className="w-3 h-3 shrink-0" aria-hidden />
          <span>{lastUpdatedPrefix}:</span>
          <span className="font-semibold text-[var(--text-secondary)]">{lastUpdatedLabel}</span>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {loading
          ? [...Array(6)].map((_, i) => <IndexCardSkeleton key={i} />)
          : indices.map(({ key, label, data, icon: Icon }, idx) => {
              const val = data?.value ?? 0;
              const changeP = data?.changePercent ?? 0;
              const isUp = changeP > 0;
              const isDown = changeP < 0;

              const accentGradient = isUp
                ? 'from-emerald-500 to-teal-400'
                : isDown
                  ? 'from-red-500 to-rose-400'
                  : 'from-[var(--brand)] to-violet-400';

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.07, ease: [0.25, 0.1, 0.25, 1] }}
                  className="group relative rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-4 flex flex-col gap-2 hover:border-[var(--brand)]/25 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 transition-all duration-200 overflow-hidden"
                >
                  {/* Gradient top accent bar — visible on hover */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accentGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
                    aria-hidden
                  />

                  {/* Label */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {Icon && <Icon className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />}
                    <span className="text-xs font-semibold text-[var(--text-secondary)] truncate leading-none">
                      {label}
                    </span>
                  </div>

                  {/* Value + sparkline */}
                  <div className="flex items-end justify-between gap-1">
                    <span className={`text-xl font-extrabold tabular-nums leading-none ${val ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
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
                </motion.div>
              );
            })}
      </div>
    </section>
  );
}
