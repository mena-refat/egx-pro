import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
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
  onClose, onSuccess, onError, onSuccessMessage, t,
}: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const finalPrice = getFinalPrice(plan);
  const planLabel =
    plan === 'pro_monthly' ? t('billing.planProMonthly')
    : plan === 'pro_yearly' ? t('billing.planProYearly')
    : plan === 'ultra_monthly' ? t('billing.planUltraMonthly')
    : t('billing.planUltraYearly');

  const handleGooglePay = async () => {
    const g = window.google?.payments?.api;
    if (!g) { onError(t('billing.upgradeFailed')); return; }
    const paymentsClient = new g.PaymentsClient({ environment: 'TEST' });
    const paymentRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [{
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: ['MASTERCARD', 'VISA'],
        },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: { gateway: 'paymob', gatewayMerchantId: 'YOUR_KEY' },
        },
      }],
      merchantInfo: { merchantId: 'YOUR_MERCHANT_ID', merchantName: 'Borsa' },
      transactionInfo: {
        totalPriceStatus: 'FINAL' as const,
        totalPrice: finalPrice.toFixed(2),
        currencyCode: 'EGP',
        countryCode: 'EG',
      },
    };

    setLoading(true);
    try {
      const paymentData = await paymentsClient.loadPaymentData(paymentRequest);
      const token = paymentData.paymentMethodData?.tokenizationData?.token;
      await api.post('/billing/upgrade', {
        plan,
        paymentToken: token,
        ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
      });
      onSuccessMessage(t('billing.upgradeSuccess'));
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: string }).statusCode;
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (statusCode === 'CANCELED') return;
      onError(code ? t(`billing.errors.${code}`, { defaultValue: t('billing.upgradeFailed') }) : t('billing.upgradeFailed'));
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
          className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="checkout-modal-title" className="text-xl font-bold text-[var(--text-primary)] mb-4">
            {t('billing.completePayment')}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {planLabel} — {finalPrice} {t('billing.egp')}
          </p>
          <Button
            type="button"
            variant="primary"
            fullWidth
            className="rounded-xl py-3 font-bold mb-2"
            loading={loading}
            disabled={loading}
            onClick={handleGooglePay}
          >
            Google Pay
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] mt-2">
            <Lock className="w-3.5 h-3.5" aria-hidden />
            {t('billing.securePayment')}
          </p>
          <Button type="button" variant="ghost" fullWidth className="mt-4" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
