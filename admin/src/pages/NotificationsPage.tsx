import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';

const PLAN_OPTIONS = [
  { id: 'free',  labelKey: 'Free' },
  { id: 'pro',   labelKey: 'Pro (Monthly)' },
  { id: 'ultra', labelKey: 'Ultra (Monthly)' },
];

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [plans, setPlans] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const togglePlan = (id: string) => {
    setPlans((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      await adminApi.post('/notifications/broadcast', {
        title,
        body,
        plans: plans.length ? plans : undefined,
      });
      setStatus('sent');
    } catch (err: any) {
      setStatus(err?.response?.data?.error ?? 'ERROR');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">{t('notifications.title')}</h1>
      {status && (
        <div className="text-sm text-emerald-300">
          {status === 'sent' ? t('notifications.sent') : status}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 max-w-lg rounded-xl border border-white/[0.07] bg-[#111118] p-5"
      >
        <div className="space-y-1.5 text-sm">
          <label className="block text-slate-300">{t('notifications.titleLabel')}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>
        <div className="space-y-1.5 text-sm">
          <label className="block text-slate-300">{t('notifications.body')}</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 min-h-[120px]"
          />
        </div>
        <div className="space-y-1.5 text-sm">
          <label className="block text-slate-300">{t('notifications.planFilter')}</label>
          <div className="flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2">
            {PLAN_OPTIONS.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={plans.includes(p.id)}
                  onChange={() => togglePlan(p.id)}
                  className="w-3 h-3 rounded border border-white/30 bg-transparent"
                />
                <span>{p.labelKey}</span>
              </label>
            ))}
            <p className="text-[11px] text-slate-500 mt-1">{t('notifications.leaveUnchecked')}</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold px-4 py-2 disabled:opacity-60"
        >
          {loading ? t('common.sending') : t('notifications.send')}
        </button>
      </form>
    </div>
  );
}
