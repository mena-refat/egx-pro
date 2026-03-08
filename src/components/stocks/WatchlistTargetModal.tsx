import React from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export interface WatchlistTargetModalProps {
  /** Target price modal: ticker + optional price */
  addTargetModal: { ticker: string } | null;
  addTargetPrice: string;
  onAddTargetPriceChange: (value: string) => void;
  addTargetSubmitting: boolean;
  onSubmitAddTarget: () => void;
  onCloseAddTarget: () => void;
  /** Limit reached modal */
  showLimitModal: boolean;
  onCloseLimitModal: () => void;
  onSubscribe: () => void;
  t: (key: string) => string;
}

export function WatchlistTargetModal({
  addTargetModal,
  addTargetPrice,
  onAddTargetPriceChange,
  addTargetSubmitting,
  onSubmitAddTarget,
  onCloseAddTarget,
  showLimitModal,
  onCloseLimitModal,
  onSubscribe,
  t,
}: WatchlistTargetModalProps) {
  return (
    <>
      {showLimitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onCloseLimitModal}
          role="presentation"
        >
          <div
            className="bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-sm w-full p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-[var(--text-secondary)] mb-6">{t('plan.watchlistLimitMessage')}</p>
            <div className="flex gap-2 justify-center">
              <Button type="button" variant="primary" onClick={onSubscribe}>
                {t('plan.subscribeNow')}
              </Button>
              <Button type="button" variant="secondary" onClick={onCloseLimitModal}>
                {t('plan.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {addTargetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onCloseAddTarget}
          role="presentation"
        >
          <div
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {t('stocks.watchlistAdd')} {addTargetModal.ticker}
            </p>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                {t('stocks.targetPriceOptional')}
              </label>
              <Input
                type="number"
                step="any"
                min={0}
                value={addTargetPrice}
                onChange={(e) => onAddTargetPriceChange(e.target.value)}
                placeholder="0"
                className="w-full"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={onCloseAddTarget} size="sm">
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={onSubmitAddTarget}
                disabled={addTargetSubmitting}
                loading={addTargetSubmitting}
                size="sm"
              >
                {addTargetSubmitting ? t('common.loading') : t('stocks.watchlistAdd')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
