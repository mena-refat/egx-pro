import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '../../ui/Button';

type Props = { activeCount: number; onAdd: () => void };

export function GoalsToolbar({ activeCount, onAdd }: Props) {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-title font-bold text-[var(--text-primary)]">{t('goals.title')}</h2>
        <p className="text-body text-[var(--text-muted)] mt-0.5">
          {activeCount} {t('goals.activeCount')}
        </p>
      </div>
      <Button type="button" onClick={onAdd} className="flex items-center gap-2" variant="primary">
        <Plus className="w-4 h-4" />
        {t('goals.addNew')}
      </Button>
    </div>
  );
}
