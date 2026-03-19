import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('common');
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
  const hasData = value > 0;
  const egx30ValueColor = hasData
    ? hasChange
      ? positive
        ? 'text-green-400'
        : 'text-red-400'
      : 'text-white/80'
    : 'text-white/40';

  return (
    <div
      className="sticky top-0 z-10 flex flex-wrap items-center justify-center gap-x-16 gap-y-2 px-10 py-3.5 text-sm text-white/60 bg-white/5 border border-white/10 rounded-2xl mx-3 mt-2"
      dir="rtl"
    >
      <span className="shrink-0 flex items-center gap-2">
        <span>{t('dashboard.marketLabel')}</span>
        {open ? (
          <>
            <span className="text-green-400 font-medium">{t('dashboard.marketOpen')}</span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" aria-hidden />
          </>
        ) : (
          <>
            <span className="text-red-400 font-medium">{t('dashboard.marketClosed')}</span>
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" aria-hidden />
          </>
        )}
      </span>
      <span className="text-white/10 select-none mx-4" aria-hidden>|</span>
      <span className="shrink-0 flex items-center gap-2 tabular-nums">
        <span>EGX30:</span>
        {hasData ? (
          <>
            <span className={`font-medium ${egx30ValueColor}`}>{formatNum(value, locale)}</span>
            {hasChange && (
              <span className={positive ? 'text-green-400' : 'text-red-400'}>
                {positive ? '▲' : '▼'} {positive ? '+' : ''}{change.toLocaleString(locale, { maximumFractionDigits: 1 })}%
              </span>
            )}
          </>
        ) : (
          <span className="text-white/40">—</span>
        )}
      </span>
      <span className="text-white/10 select-none mx-4" aria-hidden>|</span>
      <span className="shrink-0 flex items-center gap-1">
        <span>{t('dashboard.timeLabel')}</span>
        <span
          className="tabular-nums font-medium text-white/90"
          aria-label="Cairo time"
          dir="ltr"
        >
          {timeParts.hour}
          <span
            className={`inline-block w-2 text-center transition-opacity duration-150 ${colonOn ? 'opacity-100' : 'opacity-30'}`}
            aria-hidden
          >
            :
          </span>
          {timeParts.minute}
          <span className="ml-0.5 text-white/70">{timeParts.ampm}</span>
        </span>
      </span>
    </div>
  );
}
