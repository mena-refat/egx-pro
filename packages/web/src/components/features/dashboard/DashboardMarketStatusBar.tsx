import React from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  isConnected: boolean;
  showMarketOverview: boolean;
  onToggle: () => void;
  isRTL: boolean;
};

export function DashboardMarketStatusBar({ isConnected, showMarketOverview, onToggle, isRTL }: Props) {
  const { t } = useTranslation('common');

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
          {isConnected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--positive)] opacity-60" />
          )}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${isConnected ? 'bg-[var(--positive)]' : 'bg-[var(--negative)]'}`} />
        </span>
        <span className="text-body font-medium text-[var(--text-secondary)]">
          {isConnected ? t('header.market_open') : t('dashboard.connecting')}
        </span>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="text-label text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        {showMarketOverview ? t('dashboard.hideIndicators') : t('dashboard.showIndicators')}
      </button>
    </div>
  );
}
