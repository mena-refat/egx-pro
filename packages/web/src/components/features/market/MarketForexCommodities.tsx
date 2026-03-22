import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown, Circle, Timer } from 'lucide-react';
import { formatValue, formatChange } from './utils';
import type { MarketOverview } from './types';

type Props = {
  overview: MarketOverview | null;
  loading: boolean;
};

function StatusBadge({ isOpen, isDelayed, t }: {
  isOpen?: boolean;
  isDelayed?: boolean;
  t: ReturnType<typeof import('react-i18next').useTranslation<'common'>>['t'];
}) {
  if (isOpen === false)
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
        {t('delay.lastPrice')}
      </span>
    );
  if (isDelayed)
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
        <Timer className="w-3 h-3" aria-hidden /> {t('delay.delayedBadge')}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded-full">
      <Circle className="w-2 h-2 fill-[var(--success)]" aria-hidden /> {t('delay.liveBadge')}
    </span>
  );
}

function ChangeChip({ changePercent }: { changePercent: number }) {
  const isUp = changePercent > 0;
  const isDown = changePercent < 0;
  const text = formatChange(changePercent);
  if (!isUp && !isDown) return <span className="text-xs font-semibold text-[var(--text-muted)]">{text}</span>;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {text}
    </span>
  );
}

export function MarketForexCommodities({ overview, loading }: Props) {
  const { t } = useTranslation('common');
  const [goldExpanded, setGoldExpanded] = useState(false);
  const [silverExpanded, setSilverExpanded] = useState(false);

  const usdVal      = overview?.usdEgp?.value ?? 0;
  const usdChange   = overview?.usdEgp?.changePercent ?? 0;
  const buyRate     = usdVal * 0.995;
  const sellRate    = usdVal * 1.005;

  const gold24      = overview?.gold?.valueEgxPerGram ?? 0;
  const goldBuy24   = overview?.gold?.buyEgxPerGram   ?? gold24 * 1.02;
  const goldSell24  = overview?.gold?.sellEgxPerGram  ?? gold24 * 0.98;
  const goldRatesBuy  = { '24': goldBuy24,  '21': goldBuy24  * (21 / 24), '18': goldBuy24  * (18 / 24), '14': goldBuy24  * (14 / 24) };
  const goldRatesSell = { '24': goldSell24, '21': goldSell24 * (21 / 24), '18': goldSell24 * (18 / 24), '14': goldSell24 * (14 / 24) };

  const silver999     = overview?.silver?.valueEgxPerGram ?? 0;
  const silverBuy999  = overview?.silver?.buyEgxPerGram   ?? silver999 * 1.02;
  const silverSell999 = overview?.silver?.sellEgxPerGram  ?? silver999 * 0.98;
  const silverRatesBuy  = { '999': silverBuy999,  '925': silverBuy999  * (925 / 999), '800': silverBuy999  * (800 / 999) };
  const silverRatesSell = { '999': silverSell999, '925': silverSell999 * (925 / 999), '800': silverSell999 * (800 / 999) };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-28 rounded-2xl bg-[var(--bg-secondary)] animate-pulse" />
        <div className="h-16 rounded-2xl bg-[var(--bg-secondary)] animate-pulse" />
        <div className="h-16 rounded-2xl bg-[var(--bg-secondary)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── USD / EGP ──────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: icon + label + price + change */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 text-lg">
              💵
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-0.5">
                USD / {t('common.egp')}
              </p>
              <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums leading-tight">
                {formatValue(usdVal, 2)}
                <span className="text-sm font-medium text-[var(--text-muted)] ms-1.5">{t('common.egp')}</span>
              </p>
              <div className="mt-1">
                <ChangeChip changePercent={usdChange} />
              </div>
            </div>
          </div>

          {/* Right: status + buy/sell */}
          <div className="text-end shrink-0">
            <StatusBadge isOpen={undefined} isDelayed={false} t={t} />
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-end gap-2">
                <span className="text-[11px] text-[var(--text-muted)]">{t('market.buy')}</span>
                <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] min-w-[52px] text-end">
                  {formatValue(buyRate, 2)}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="text-[11px] text-[var(--text-muted)]">{t('market.sell')}</span>
                <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] min-w-[52px] text-end">
                  {formatValue(sellRate, 2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Gold ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <button
          type="button"
          onClick={() => setGoldExpanded(!goldExpanded)}
          className="w-full flex items-center gap-3 p-4 hover:bg-[var(--bg-card-hover)] transition-colors text-start"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 text-lg">
            🥇
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--text-primary)] text-sm">{t('market.gold24k')}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <StatusBadge
                isOpen={overview?.goldMarketStatus?.isOpen}
                isDelayed={overview?.gold?.isDelayed}
                t={t}
              />
              <ChangeChip changePercent={overview?.gold?.changePercent ?? 0} />
            </div>
          </div>
          <div className="text-end shrink-0">
            <p className="font-bold text-[var(--text-primary)] tabular-nums text-base">
              {formatValue(gold24, 0)}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">{t('market.perGram')}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform shrink-0 ${goldExpanded ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {goldExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-[var(--border)] px-4 py-3 space-y-0">
                {/* Header row */}
                <div className="grid grid-cols-3 gap-2 pb-2 mb-1 border-b border-[var(--border)]">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{t('market.karat24').replace('24', '')}</span>
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide text-center">{t('market.buy')}</span>
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide text-end">{t('market.sell')}</span>
                </div>
                {(['24', '21', '18', '14'] as const).map((k, i) => (
                  <div key={k} className={`grid grid-cols-3 gap-2 py-2 ${i < 3 ? 'border-b border-[var(--border)]/50' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      {i === 0 && <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] shrink-0" />}
                      <span className={`text-sm font-medium ${i === 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                        {t(`market.karat${k}` as 'market.karat24')}
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] text-center">
                      {formatValue(goldRatesBuy[k], 0)}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] text-end">
                      {formatValue(goldRatesSell[k], 0)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Silver ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <button
          type="button"
          onClick={() => setSilverExpanded(!silverExpanded)}
          className="w-full flex items-center gap-3 p-4 hover:bg-[var(--bg-card-hover)] transition-colors text-start"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-400/10 flex items-center justify-center shrink-0 text-lg">
            🥈
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--text-primary)] text-sm">{t('market.silver999')}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <StatusBadge
                isOpen={overview?.goldMarketStatus?.isOpen}
                isDelayed={overview?.silver?.isDelayed}
                t={t}
              />
              <ChangeChip changePercent={overview?.silver?.changePercent ?? 0} />
            </div>
          </div>
          <div className="text-end shrink-0">
            <p className="font-bold text-[var(--text-primary)] tabular-nums text-base">
              {formatValue(silver999, 2)}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">{t('market.perGram')}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform shrink-0 ${silverExpanded ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {silverExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-[var(--border)] px-4 py-3 space-y-0">
                {/* Header row */}
                <div className="grid grid-cols-3 gap-2 pb-2 mb-1 border-b border-[var(--border)]">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{t('market.purity999').replace('999', '')}&nbsp;</span>
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide text-center">{t('market.buy')}</span>
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide text-end">{t('market.sell')}</span>
                </div>
                {(['999', '925', '800'] as const).map((k, i) => (
                  <div key={k} className={`grid grid-cols-3 gap-2 py-2 ${i < 2 ? 'border-b border-[var(--border)]/50' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      {i === 0 && <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] shrink-0" />}
                      <span className={`text-sm font-medium ${i === 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                        {t(`market.purity${k}` as 'market.purity999')}
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] text-center">
                      {formatValue(silverRatesBuy[k], 2)}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] text-end">
                      {formatValue(silverRatesSell[k], 2)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
