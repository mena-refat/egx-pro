import React from 'react';
import { useTranslation } from 'react-i18next';

export function PredictionsStockTab() {
  const { t } = useTranslation('common');

  return (
    <p className="text-[var(--text-muted)] py-8 text-center">
      {t('predictions.selectStock')} - قريباً
    </p>
  );
}
