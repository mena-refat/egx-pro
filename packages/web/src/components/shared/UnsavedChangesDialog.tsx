import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export function UnsavedChangesDialog({ isOpen, onStay, onLeave }: UnsavedChangesDialogProps) {
  const { t } = useTranslation('common');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-[var(--border)]">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--warning-bg)] flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-[var(--warning)]" />
          </div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            {t('common.unsavedChangesTitle')}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {t('common.unsavedChangesMessage')}
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <button
            type="button"
            onClick={onLeave}
            className="w-full py-2.5 rounded-xl border border-[var(--danger)] text-[var(--danger)] text-sm font-semibold hover:bg-[var(--danger-bg)] transition-colors"
          >
            {t('common.unsavedLeave')}
          </button>
          <button
            type="button"
            onClick={onStay}
            className="w-full py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-hover)] transition-colors"
          >
            {t('common.unsavedStay')}
          </button>
        </div>
      </div>
    </div>
  );
}
