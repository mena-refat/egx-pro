import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Loader2 } from 'lucide-react';
import api from '../../../lib/api';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

interface PlanData {
  plan?: string;
  planExpiresAt?: string | null;
  analysis?: { used: number; quota: number; month: string };
  referralPro?: { daysRemaining: number; expiresAt?: string | null };
}

export function SubscriptionTab() {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/billing/plan', { signal: controller.signal })
      .then((res) => { if (!controller.signal.aborted) setPlanData((res.data as { data?: PlanData })?.data ?? res.data); })
      .catch(() => { if (!controller.signal.aborted) setPlanData(null); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const handleValidateCode = async () => {
    if (!discountCode.trim()) return;
    setValidating(true);
    setMessage(null);
    try {
      const res = await api.post('/billing/discount/validate', { code: discountCode.trim(), plan: 'pro' });
      const payload = (res.data as { data?: { valid?: boolean } })?.data ?? res.data;
      if (payload?.valid) setMessage(t('settings.discountValid', { defaultValue: 'الكود صالح' }));
      else setMessage((res.data as { error?: string })?.error || t('common.error'));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setMessage(err.response?.data?.error || t('common.error'));
    } finally {
      setValidating(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    setMessage(null);
    try {
      await api.post('/billing/upgrade', { plan: 'pro', discountCode: discountCode.trim() || undefined });
      setMessage(t('settings.upgradeSuccess', { defaultValue: 'تم التحديث بنجاح' }));
      const res = await api.get('/billing/plan');
      setPlanData((res.data as { data?: PlanData })?.data ?? res.data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setMessage(err.response?.data?.error ?? t('common.error'));
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-[var(--text-muted)]">{t('common.loading')}</div>;

  const plan = planData?.plan ?? 'free';
  const isPro = plan === 'pro' || plan === 'annual';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-[var(--text-muted)]" />
          {t('settings.subscription', { defaultValue: 'الاشتراك' })}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {isPro ? t('settings.planPro', { defaultValue: 'خطة Pro مفعّلة' }) : t('settings.planFree', { defaultValue: 'الخطة الحالية: مجانية' })}
        </p>
        {planData?.planExpiresAt && (
          <p className="text-xs text-[var(--text-muted)] mb-4">
            {t('settings.expiresAt', { defaultValue: 'تنتهي في' })}: {new Date(planData.planExpiresAt).toLocaleDateString()}
          </p>
        )}
        {!isPro && (
          <div className="space-y-3">
            <Input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder={t('settings.discountCodePlaceholder', { defaultValue: 'كود الخصم' })}
            />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={handleValidateCode} disabled={validating} loading={validating}>
                {t('settings.validateCode', { defaultValue: 'التحقق من الكود' })}
              </Button>
              <Button type="button" variant="primary" onClick={handleUpgrade} disabled={upgrading} loading={upgrading}>
                {t('settings.upgrade', { defaultValue: 'ترقية' })}
              </Button>
            </div>
          </div>
        )}
        {message && <p className="text-sm text-[var(--text-muted)] mt-2">{message}</p>}
      </div>
    </div>
  );
}
