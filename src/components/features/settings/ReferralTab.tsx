import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, Copy, Loader2 } from 'lucide-react';
import api from '../../../lib/api';
import { Button } from '../../ui/Button';

interface ReferralData {
  code?: string;
  completedCount?: number;
  goal?: number;
  totalReferrals?: number;
  friends?: { id: string; name: string | null; order: number }[];
}

export function ReferralTab() {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.get('/user/referral')
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleCopy = () => {
    if (data?.code) {
      navigator.clipboard.writeText(data.code);
      setCopied(true);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => {
        setCopied(false);
        copiedTimeoutRef.current = null;
      }, 2000);
    }
  };

  if (loading) return <div className="p-6 text-center text-[var(--text-muted)]">{t('common.loading')}</div>;

  const code = data?.code ?? '';
  const total = data?.totalReferrals ?? data?.completedCount ?? 0;
  const goal = data?.goal ?? 5;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-[var(--text-muted)]" />
          {t('settings.referral', { defaultValue: 'الدعوات' })}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {t('settings.referralDesc', { defaultValue: 'شارك كودك مع أصدقائك. عند انضمامهم وتحقيق الهدف تحصل على مكافأة.' })}
        </p>
        <div className="flex items-center gap-2 mb-4">
          <code className="flex-1 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm font-mono text-[var(--text-primary)]">
            {code || '—'}
          </code>
          <Button type="button" variant="secondary" size="sm" onClick={handleCopy} disabled={!code}>
            {copied ? t('success.copied') : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {t('settings.referralProgress', { defaultValue: 'الإحالات' })}: {total} / {goal}
        </p>
      </div>
    </div>
  );
}
