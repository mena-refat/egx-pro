import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney } from './goalsUtils';

type Props = { currentWealth: number; locale: string };

export function GoalsWealthBanner({ currentWealth, locale }: Props) {
  const { t } = useTranslation('common');
  if (currentWealth <= 0) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
      <p className="text-body text-[var(--text-secondary)]">
        {t('goals.portfolioAvailable')}:{' '}
        <span className="font-semibold text-[var(--text-primary)]">{formatMoney(currentWealth, locale)} ج.م</span>
      </p>
    </div>
  );
}
