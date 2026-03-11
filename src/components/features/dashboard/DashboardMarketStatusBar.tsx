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
        <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-[var(--positive)]' : 'bg-[var(--negative)]'}`} />
        <span className="text-body font-medium text-[var(--text-secondary)]">
          {isConnected ? t('header.market_open') : t('dashboard.connecting')}
        </span>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="text-label text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        {showMarketOverview ? (isRTL ? 'إخفاء المؤشرات' : 'Hide Indicators') : (isRTL ? 'إظهار المؤشرات' : 'Show Indicators')}
      </button>
    </div>
  );
}
