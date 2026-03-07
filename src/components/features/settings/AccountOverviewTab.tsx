import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, BarChart2, TrendingUp, CalendarCheck, Wallet } from 'lucide-react';
import api from '../../../lib/api';

interface ProfileStats {
  analysesCount?: number;
  watchlistCount?: number;
  portfolioCount?: number;
  portfolioValue?: number;
  daysSinceJoined?: number;
}

interface CompletionData {
  percentage?: number;
  missing?: { field: string; route: string }[];
}

export function AccountOverviewTab() {
  const { t } = useTranslation('common');
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [completion, setCompletion] = useState<CompletionData | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/user/profile/stats').then((r) => r.data).catch(() => null),
      api.get('/profile/completion').then((r) => r.data).catch(() => null),
    ]).then(([s, c]) => {
      if (!cancelled) {
        setStats(s ?? null);
        setCompletion(c ?? null);
      }
    }).finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (statsLoading) return <div className="p-6 text-center text-[var(--text-muted)]">{t('common.loading')}</div>;

  const statItems = [
    { label: t('overview.statsAnalyses'), value: stats?.analysesCount ?? 0, icon: BarChart2 },
    { label: t('overview.statsStocks'), value: stats?.watchlistCount ?? 0, icon: TrendingUp },
    { label: t('overview.statsDays'), value: stats?.daysSinceJoined ?? 0, icon: CalendarCheck },
    { label: t('overview.statsPortfolio'), value: Math.round(stats?.portfolioValue ?? 0), icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-[var(--text-muted)]" />
          {t('settings.accountOverview', { defaultValue: 'نظرة على الحساب' })}
        </h3>
        {completion && completion.percentage != null && completion.percentage < 100 && (
          <div className="mb-4">
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              {t('overview.completeProfile')}: {completion.percentage}%
            </p>
            <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--brand)]" style={{ width: `${completion.percentage}%` }} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          {statItems.map((item, i) => (
            <div key={i} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-center">
              <item.icon className="mx-auto mb-2 w-6 h-6 text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-muted)] mb-1">{item.label}</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
