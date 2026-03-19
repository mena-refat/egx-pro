import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Circle, Timer } from 'lucide-react';
import { formatValue, formatChange } from './utils';
import type { MarketOverview } from './types';

type Props = {
  overview: MarketOverview | null;
  loading: boolean;
};

export function MarketForexCommodities({ overview, loading }: Props) {
  const { t } = useTranslation('common');
  const [goldExpanded, setGoldExpanded] = useState(false);
  const [silverExpanded, setSilverExpanded] = useState(false);

  const usdVal = overview?.usdEgp?.value ?? 0;
  const buyRate = usdVal * 0.995;
  const sellRate = usdVal * 1.005;
  const gold24 = overview?.gold?.valueEgxPerGram ?? 0;
  const goldBuy24 = overview?.gold?.buyEgxPerGram ?? gold24 * 1.02;
  const goldSell24 = overview?.gold?.sellEgxPerGram ?? gold24 * 0.98;
  const goldRatesBuy = { '24': goldBuy24, '21': goldBuy24 * (21 / 24), '18': goldBuy24 * (18 / 24), '14': goldBuy24 * (14 / 24) };
  const goldRatesSell = { '24': goldSell24, '21': goldSell24 * (21 / 24), '18': goldSell24 * (18 / 24), '14': goldSell24 * (14 / 24) };
  const silver999 = overview?.silver?.valueEgxPerGram ?? 0;
  const silverBuy999 = overview?.silver?.buyEgxPerGram ?? silver999 * 1.02;
  const silverSell999 = overview?.silver?.sellEgxPerGram ?? silver999 * 0.98;
  const silverRatesBuy = { '999': silverBuy999, '925': silverBuy999 * (925 / 999), '800': silverBuy999 * (800 / 999) };
  const silverRatesSell = { '999': silverSell999, '925': silverSell999 * (925 / 999), '800': silverSell999 * (800 / 999) };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
        <div className="h-20 rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
        <div className="h-20 rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-medium text-[var(--text-secondary)]">$ USD / EGP</p>
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--success)]">
            <Circle className="w-3 h-3 fill-[var(--success)]" aria-hidden /> {t('delay.liveBadge')}
          </span>
        </div>
        <p className="text-xl font-bold text-[var(--text-primary)]">{formatValue(usdVal, 2)} ج.م</p>
        <p className={`text-sm font-semibold mt-1 ${(overview?.usdEgp?.changePercent ?? 0) > 0 ? 'text-[var(--success)]' : (overview?.usdEgp?.changePercent ?? 0) < 0 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
          {formatChange(overview?.usdEgp?.changePercent ?? 0)}
        </p>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          {t('market.buy')}: {formatValue(buyRate, 2)} &nbsp; {t('market.sell')}: {formatValue(sellRate, 2)}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setGoldExpanded(!goldExpanded)}
          className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-[var(--bg-card-hover)] transition-colors"
        >
          <span className="font-medium text-[var(--text-secondary)]">{t('market.gold24k')} <ChevronDown className={`w-4 h-4 inline-block align-middle transition-transform ${goldExpanded ? 'rotate-180' : ''}`} /></span>
          <span className="flex items-center gap-3 flex-wrap justify-end">
            {overview?.goldMarketStatus?.isOpen === false ? (
              <span className="text-xs font-medium text-[var(--text-muted)]">{t('delay.lastPrice')} · {t('delay.goldClosedUntil')}</span>
            ) : overview?.gold?.isDelayed ? (
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--text-muted)]"><Timer className="w-3 h-3" aria-hidden /> {t('delay.delayedBadge')}</span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--success)]"><Circle className="w-3 h-3 fill-[var(--success)]" aria-hidden /> {t('delay.liveBadge')}</span>
            )}
            <span className={`text-xs font-semibold ${(overview?.gold?.changePercent ?? 0) > 0 ? 'text-[var(--success)]' : (overview?.gold?.changePercent ?? 0) < 0 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
              {formatChange(overview?.gold?.changePercent ?? 0)}
            </span>
            <span className="text-xs text-[var(--text-muted)]">{t('market.perGram')}: {formatValue(gold24, 0)} ج.م</span>
          </span>
        </button>
        <AnimatePresence>
          {goldExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="border-t border-[var(--border)] overflow-hidden">
              <ul className="p-4 space-y-2">
                {(['24', '21', '18', '14'] as const).map((k, i) => (
                  <li key={k} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      {i === 0 && <span className="text-[var(--success)]">✓</span>}
                      <span className={i === 0 ? 'font-medium text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}>{t(`market.karat${k}` as 'market.karat24')}</span>
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {t('market.buy')}: <span className="font-medium text-[var(--text-primary)]">{formatValue(goldRatesBuy[k], 0)}</span>
                      {' · '}
                      {t('market.sell')}: <span className="font-medium text-[var(--text-primary)]">{formatValue(goldRatesSell[k], 0)}</span> {t('market.perGram')}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setSilverExpanded(!silverExpanded)}
          className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-[var(--bg-card-hover)] transition-colors"
        >
          <span className="font-medium text-[var(--text-secondary)]">{t('market.silver999')} <ChevronDown className={`w-4 h-4 inline-block align-middle transition-transform ${silverExpanded ? 'rotate-180' : ''}`} /></span>
          <span className="flex items-center gap-3 flex-wrap justify-end">
            {overview?.goldMarketStatus?.isOpen === false ? (
              <span className="text-xs font-medium text-[var(--text-muted)]">{t('delay.lastPrice')} · {t('delay.goldClosedUntil')}</span>
            ) : overview?.silver?.isDelayed ? (
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--text-muted)]"><Timer className="w-3 h-3" aria-hidden /> {t('delay.delayedBadge')}</span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--success)]"><Circle className="w-3 h-3 fill-[var(--success)]" aria-hidden /> {t('delay.liveBadge')}</span>
            )}
            <span className={`text-xs font-semibold ${(overview?.silver?.changePercent ?? 0) > 0 ? 'text-[var(--success)]' : (overview?.silver?.changePercent ?? 0) < 0 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
              {formatChange(overview?.silver?.changePercent ?? 0)}
            </span>
            <span className="text-xs text-[var(--text-muted)]">{t('market.perGram')}: {formatValue(silver999, 2)} ج.م</span>
          </span>
        </button>
        <AnimatePresence>
          {silverExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="border-t border-[var(--border)] overflow-hidden">
              <ul className="p-4 space-y-2">
                {(['999', '925', '800'] as const).map((k, i) => (
                  <li key={k} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      {i === 0 && <span className="text-[var(--success)]">✓</span>}
                      <span className={i === 0 ? 'font-medium text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}>{t(`market.purity${k}` as 'market.purity999')}</span>
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {t('market.buy')}: <span className="font-medium text-[var(--text-primary)]">{formatValue(silverRatesBuy[k], 2)}</span>
                      {' · '}
                      {t('market.sell')}: <span className="font-medium text-[var(--text-primary)]">{formatValue(silverRatesSell[k], 2)}</span> {t('market.perGram')}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
