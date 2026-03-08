import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, Loader2 } from 'lucide-react';
import api from '../../../lib/api';

interface Achievement {
  id: string;
  level: string;
  title: string;
  shortDescription: string;
  completed: boolean;
  date?: string | null;
  progress?: number;
  target?: number;
}

export function AchievementsTab() {
  const { t, i18n } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Achievement[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/user/achievements', { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        const raw = Array.isArray((res.data as { data?: unknown[] })?.data) ? (res.data as { data: unknown[] }).data : (Array.isArray(res.data) ? res.data : []);
        setItems(raw.map((a: Record<string, unknown>) => ({
          id: String(a.id ?? ''),
          level: String(a.level ?? ''),
          title: String(a.title ?? ''),
          shortDescription: String(a.shortDescription ?? ''),
          completed: Boolean(a.completed),
          date: a.date ? String(a.date) : null,
          progress: typeof a.progress === 'number' ? a.progress : undefined,
          target: typeof a.target === 'number' ? a.target : undefined,
        })));
      })
      .catch(() => { if (!controller.signal.aborted) setError(t('common.error')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [t]);

  if (loading) return <div className="p-6 text-center text-[var(--text-muted)]">{t('common.loading')}</div>;
  if (error) return <div className="p-6 text-center text-[var(--danger)]">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-[var(--text-muted)]" />
          {t('achievements.tabLabel')}
        </h3>
        <ul className="space-y-3">
          {items.map((a) => (
            <li
              key={a.id}
              className={`p-4 rounded-xl border ${a.completed ? 'border-[var(--success)] bg-[var(--success-bg)]' : 'border-[var(--border)] bg-[var(--bg-input)]'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-[var(--text-primary)]">{a.title}</span>
                {a.completed && a.date && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(a.date).toLocaleDateString(i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB')}
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{a.shortDescription}</p>
              {a.progress != null && a.target != null && !a.completed && (
                <p className="text-xs text-[var(--text-muted)] mt-2">{a.progress} / {a.target}</p>
              )}
            </li>
          ))}
        </ul>
        {items.length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">{t('achievements.noAchievements', { defaultValue: 'لا توجد إنجازات بعد' })}</p>
        )}
      </div>
    </div>
  );
}
