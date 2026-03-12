import React, { useState, useEffect } from 'react';
import { isEgyptMarketOpen, formatCairoTimeEn } from '../../../lib/cairoTime';

type DataPoint = { value?: number; changePercent?: number };

type Props = {
  egx30: DataPoint | null;
  locale: string;
};

function formatNum(n: number, locale: string): string {
  return n.toLocaleString(locale, { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

export function DashboardMarketBar({ egx30, locale }: Props) {
  const [timeParts, setTimeParts] = useState(() => formatCairoTimeEn());
  const [open, setOpen] = useState(() => isEgyptMarketOpen());
  const [colonOn, setColonOn] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date();
      setTimeParts(formatCairoTimeEn(now));
      setOpen(isEgyptMarketOpen(now));
      setColonOn((c) => !c);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const value = egx30?.value ?? 0;
  const change = egx30?.changePercent ?? 0;
  const hasChange = Number.isFinite(change) && change !== 0;
  const positive = change > 0;
  const valueColor = hasChange ? (positive ? 'text-[var(--success)]' : 'text-[var(--danger)]') : 'text-[var(--text-primary)]';

  return (
    <div
      className="sticky top-0 z-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 px-4 py-2.5 text-sm text-[var(--text-secondary)] bg-[var(--bg-secondary)] border-b border-[var(--border)] shadow-sm"
      dir="rtl"
    >
      <span className="shrink-0 flex items-center gap-2">
        <span className="text-[var(--text-muted)]">السوق:</span>
        {open ? (
          <>
            مفتوح{' '}
            <span
              className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse"
              aria-hidden
            />
          </>
        ) : (
          <>
            مغلق{' '}
            <span
              className="w-2 h-2 rounded-full bg-[var(--danger)] animate-pulse"
              aria-hidden
            />
          </>
        )}
      </span>
      <span className="text-[var(--border)] select-none" aria-hidden>|</span>
      <span className="shrink-0 flex items-center gap-2 tabular-nums">
        <span className="text-[var(--text-muted)]">EGX30:</span>
        {value > 0 ? (
          <>
            <span className="text-[var(--text-primary)] font-medium">{formatNum(value, locale)}</span>
            {hasChange && (
              <span className={valueColor}>
                {positive ? '▲' : '▼'} {positive ? '+' : ''}{change.toLocaleString(locale, { maximumFractionDigits: 1 })}%
              </span>
            )}
          </>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        )}
      </span>
      <span className="text-[var(--border)] select-none" aria-hidden>|</span>
      <span className="shrink-0 flex items-center gap-0.5">
        <span className="text-[var(--text-muted)]">الوقت:</span>
        <span
          className="tabular-nums text-[var(--text-primary)] font-medium"
          aria-label="Cairo time"
        >
          {timeParts.hour}
          <span
            className={`inline-block w-2 text-center transition-opacity duration-150 ${colonOn ? 'opacity-100' : 'opacity-30'}`}
            aria-hidden
          >
            :
          </span>
          {timeParts.minute}
          <span className="ml-1 text-[var(--text-muted)] font-normal">{timeParts.ampm}</span>
        </span>
      </span>
    </div>
  );
}
