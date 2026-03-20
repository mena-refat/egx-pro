import React from 'react';
import { X, Bell, Lock, Star } from 'lucide-react';
import { Button } from '../../ui/Button';
import type { TFunction } from 'i18next';

interface WatchlistTargetModalProps {
  // Add to watchlist modal
  addTargetModal: { ticker: string } | null;
  addTargetPrice: string;
  onAddTargetPriceChange: (v: string) => void;
  addTargetSubmitting: boolean;
  addTargetError: string | null;
  onSubmitAddTarget: () => void;
  onCloseAddTarget: () => void;
  // Watchlist limit modal
  showLimitModal: boolean;
  onCloseLimitModal: () => void;
  // Price alert pro modal
  showPriceAlertProModal: boolean;
  onClosePriceAlertProModal: () => void;
  onSubscribe: () => void;
  t: TFunction;
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    />
  );
}

function ModalCard({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function WatchlistTargetModal({
  addTargetModal,
  addTargetPrice,
  onAddTargetPriceChange,
  addTargetSubmitting,
  addTargetError,
  onSubmitAddTarget,
  onCloseAddTarget,
  showLimitModal,
  onCloseLimitModal,
  showPriceAlertProModal,
  onClosePriceAlertProModal,
  onSubscribe,
  t,
}: WatchlistTargetModalProps) {
  return (
    <>
      {/* ── Add to watchlist modal ── */}
      {addTargetModal && (
        <ModalCard onClose={onCloseAddTarget}>
          <button
            type="button"
            onClick={onCloseAddTarget}
            className="absolute top-4 end-4 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-[var(--brand)]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">{t('stocks.watchlistAdd')}</p>
              <p className="text-xs text-[var(--text-muted)]">{addTargetModal.ticker}</p>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={addTargetPrice}
              onChange={(e) => onAddTargetPriceChange(e.target.value)}
              placeholder={t('stocks.targetPriceOptional')}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)]/50 transition-colors"
            />
            {addTargetError && (
              <p className="text-xs text-[var(--danger)]">{addTargetError}</p>
            )}
            <Button
              type="button"
              variant="primary"
              onClick={onSubmitAddTarget}
              loading={addTargetSubmitting}
              disabled={addTargetSubmitting}
              className="w-full"
            >
              {t('stocks.watchlistAdd')}
            </Button>
          </div>
        </ModalCard>
      )}

      {/* ── Watchlist limit modal ── */}
      {showLimitModal && (
        <ModalCard onClose={onCloseLimitModal}>
          <button
            type="button"
            onClick={onCloseLimitModal}
            className="absolute top-4 end-4 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-[var(--text-primary)] mb-1">
                {t('subscription.availableInPro')}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {t('subscription.watchlistLimitMessage')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onCloseLimitModal} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button type="button" variant="primary" onClick={onSubscribe} className="flex-1">
                {t('predictions.upgradeNow')}
              </Button>
            </div>
          </div>
        </ModalCard>
      )}

      {/* ── Price alert Pro-only modal ── */}
      {showPriceAlertProModal && (
        <ModalCard onClose={onClosePriceAlertProModal}>
          <button
            type="button"
            onClick={onClosePriceAlertProModal}
            className="absolute top-4 end-4 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[var(--brand)]/10 flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6 text-[var(--brand)]" />
            </div>
            <div>
              <p className="font-bold text-[var(--text-primary)] mb-1">
                {t('subscription.availableInPro')}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {t('subscription.priceAlertsProMessage')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClosePriceAlertProModal} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button type="button" variant="primary" onClick={onSubscribe} className="flex-1">
                {t('predictions.upgradeNow')}
              </Button>
            </div>
          </div>
        </ModalCard>
      )}
    </>
  );
}
