import React, { useState, useEffect } from 'react';
import { Bell, BellOff, TrendingUp, TrendingDown, X, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PriceAlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  currentPrice: number;
  currentAlert: { targetPrice: number | null; targetDirection: 'UP' | 'DOWN' } | null;
  isPro: boolean;
  onSave: (targetPrice: number | null, targetDirection: 'UP' | 'DOWN') => Promise<void>;
  isRTL?: boolean;
}

export function PriceAlertDialog({
  isOpen,
  onClose,
  ticker,
  currentPrice,
  currentAlert,
  isPro,
  onSave,
  isRTL = false,
}: PriceAlertDialogProps) {
  const { t } = useTranslation('common');
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Sync input with existing alert
  useEffect(() => {
    if (isOpen) {
      setInputValue(currentAlert?.targetPrice != null ? String(currentAlert.targetPrice) : '');
      setToast(null);
    }
  }, [isOpen, currentAlert]);

  if (!isOpen) return null;

  const targetPrice = parseFloat(inputValue);
  const isValidPrice = !isNaN(targetPrice) && targetPrice > 0;
  const direction: 'UP' | 'DOWN' =
    isValidPrice && targetPrice < currentPrice ? 'DOWN' : 'UP';
  const sameAsCurrent = isValidPrice && Math.abs(targetPrice - currentPrice) < 0.001;

  const hasExistingAlert = currentAlert?.targetPrice != null;

  async function handleSave() {
    if (!isValidPrice || sameAsCurrent) return;
    setSaving(true);
    try {
      await onSave(targetPrice, direction);
      setToast(t('stockDetail.priceAlertSuccess'));
      setTimeout(() => {
        setToast(null);
        onClose();
      }, 1200);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await onSave(null, 'UP');
      setToast(t('stockDetail.priceAlertDeleted'));
      setTimeout(() => {
        setToast(null);
        onClose();
      }, 1000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-sm bg-[var(--bg-secondary)] rounded-t-2xl sm:rounded-2xl border border-[var(--border)] p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[var(--brand)]" />
            <h2 className="font-bold text-[var(--text-primary)] text-base">
              {t('stockDetail.priceAlertTitle')} - {ticker}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isPro ? (
          // Pro gate
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Lock className="w-8 h-8 text-[var(--brand)]" />
            <p className="text-[var(--text-secondary)] text-sm">{t('stockDetail.priceAlertProOnly')}</p>
          </div>
        ) : (
          <>
            {/* Current price reference */}
            <p className="text-xs text-[var(--text-muted)] mb-3">
              {t('stockDetail.currentPrice')}: <span className="font-semibold text-[var(--text-primary)]">{currentPrice.toFixed(2)} {t('common.egp')}</span>
            </p>

            {/* Price input */}
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              {t('stockDetail.priceAlertTargetLabel')}
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={currentPrice.toFixed(2)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] mb-2"
            />

            {/* Direction indicator */}
            {isValidPrice && !sameAsCurrent && (
              <div className={`flex items-center gap-1.5 text-xs font-medium mb-3 ${direction === 'UP' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                {direction === 'UP' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {t(direction === 'UP' ? 'stockDetail.priceAlertDirectionUp' : 'stockDetail.priceAlertDirectionDown')} {targetPrice.toFixed(2)} {t('common.egp')}
              </div>
            )}

            {sameAsCurrent && (
              <p className="text-xs text-[var(--warning)] mb-3">{t('stockDetail.priceAlertSameAsCurrent')}</p>
            )}

            {/* Toast */}
            {toast && (
              <p className="text-xs text-[var(--success)] mb-2 font-medium">{toast}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isValidPrice || sameAsCurrent}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[var(--brand)] text-white text-sm font-semibold disabled:opacity-40"
              >
                <Bell className="w-4 h-4" />
                {t('stockDetail.priceAlertSave')}
              </button>
              {hasExistingAlert && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-[var(--danger)] text-[var(--danger)] text-sm font-medium disabled:opacity-40"
                >
                  <BellOff className="w-4 h-4" />
                  {t('stockDetail.priceAlertDelete')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
