import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CreditCard } from 'lucide-react';
import api from '../../../../lib/api';
import { Button } from '../../../ui/Button';
import { PaidPlanId } from './types';

interface CheckoutModalProps {
  open: boolean;
  plan: PaidPlanId;
  getFinalPrice: (plan: PaidPlanId) => number;
  discountCode: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
  onSuccessMessage: (message: string) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

export function CheckoutModal({
  open, plan, getFinalPrice, discountCode,
  onClose, onError, t,
}: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const finalPrice = getFinalPrice(plan);
  const planLabel =
    plan === 'pro_monthly'   ? t('billing.planProMonthly')
    : plan === 'pro_yearly'  ? t('billing.planProYearly')
    : plan === 'ultra_monthly' ? t('billing.planUltraMonthly')
    : t('billing.planUltraYearly');

  const handlePaymob = async () => {
    setLoading(true);
    try {
      const res = await api.post('/billing/paymob/initiate', {
        plan,
        ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
      });
      const data = res.data as
        | { data: { checkoutUrl?: string; devMode?: boolean } }
        | { checkoutUrl?: string; devMode?: boolean };
      const result = (data as { data?: { checkoutUrl?: string; devMode?: boolean } }).data ?? data as { checkoutUrl?: string; devMode?: boolean };

      if (result.devMode) {
        // Dev mode: backend has no Paymob credentials — do a direct upgrade with dev token
        await api.post('/billing/upgrade', {
          plan,
          paymentToken: 'dev_test_token_1',
          ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
        });
        // Reload to reflect new plan
        window.location.reload();
        return;
      }

      if (result.checkoutUrl) {
        // Store pending upgrade in sessionStorage so we can complete on return
        sessionStorage.setItem('paymob_pending', JSON.stringify({ plan, discountCode: discountCode.trim() }));
        window.location.href = result.checkoutUrl;
        return;
      }

      onError(t('billing.upgradeFailed'));
    } catch {
      onError(t('billing.upgradeFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-primary)]/80 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-[var(--brand)]" />
            </div>
            <div>
              <h2 id="checkout-modal-title" className="text-base font-bold text-[var(--text-primary)]">
                {t('billing.completePayment')}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">{planLabel}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] mb-4 text-center">
            <span className="text-3xl font-black text-[var(--text-primary)] tabular-nums">{finalPrice.toLocaleString()}</span>
            <span className="text-sm text-[var(--text-muted)] ms-1.5">{t('billing.egp')}</span>
          </div>

          <Button
            type="button"
            variant="primary"
            fullWidth
            className="rounded-xl py-3 font-bold mb-2"
            loading={loading}
            disabled={loading}
            onClick={handlePaymob}
          >
            {t('billing.payNow')}
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] mt-2">
            <Lock className="w-3.5 h-3.5" aria-hidden />
            {t('billing.securePayment')}
          </p>

          <Button type="button" variant="ghost" fullWidth className="mt-3" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
