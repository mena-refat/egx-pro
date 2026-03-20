import { Check, X, Sparkles } from 'lucide-react';

const COMPARISON_ROWS = [
  { featureKey: 'compareWatchlist',         free: '—',  pro: '5',         ultra: 'unlimited' },
  { featureKey: 'comparePortfolio',         free: '3',  pro: '10',        ultra: 'unlimited' },
  { featureKey: 'compareGoals',             free: '1',  pro: '3',         ultra: 'unlimited' },
  { featureKey: 'compareAi',               free: '3',  pro: '20',        ultra: '45'        },
  { featureKey: 'comparePredictions',       free: '3',  pro: '10',        ultra: '20'        },
  { featureKey: 'comparePredictionsActive', free: '10', pro: '35',        ultra: '60'        },
  { featureKey: 'compareExactMode',         free: 'x',  pro: 'check',     ultra: 'check'     },
  { featureKey: 'compareRealtime',          free: 'x',  pro: 'check',     ultra: 'check'     },
  { featureKey: 'compareAlerts',            free: 'x',  pro: 'check',     ultra: 'check'     },
  { featureKey: 'compareSharia',            free: 'check', pro: 'check',  ultra: 'check'     },
  { featureKey: 'compareSupport',           free: 'x',  pro: 'standard',  ultra: 'priority'  },
];

function Cell({ value, unlimited, t }: { value: string; unlimited: string; t: (k: string) => string }) {
  if (value === 'check') return <Check className="w-4 h-4 text-[var(--success)]" aria-hidden />;
  if (value === 'x') return <X className="w-4 h-4 text-[var(--text-muted)]" aria-hidden />;
  if (value === 'unlimited') return <span>{unlimited}</span>;
  if (value === 'standard') return (
    <span className="text-xs font-medium text-[var(--text-secondary)]">{t('billing.supportStandard')}</span>
  );
  if (value === 'priority') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
      <Sparkles className="w-3.5 h-3.5" aria-hidden />
      {t('billing.supportPriority')}
    </span>
  );
  return <span>{value}</span>;
}

interface ComparisonTableProps {
  t: (k: string) => string;
  onFeatureClick: (featureKey: string) => void;
}

export function ComparisonTable({ t, onFeatureClick }: ComparisonTableProps) {
  return (
    <section className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden" aria-labelledby="compare-plans">
      <h2 id="compare-plans" className="text-xl font-bold text-[var(--text-primary)] py-6 px-6 border-b border-[var(--border)]">
        {t('billing.compareTitle')}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px] text-sm text-[var(--text-secondary)] table-fixed">
          <colgroup>
            <col style={{ width: '40%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
              <th className="text-start py-4 px-4 font-semibold text-[var(--text-primary)]">{t('billing.compareFeature')}</th>
              <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">{t('billing.planFreeName')}</th>
              <th className="text-center py-4 px-4 font-semibold text-[var(--brand)]">{t('billing.planPro')}</th>
              <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">{t('billing.planUltra')}</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => (
              <tr key={row.featureKey} className={`border-b border-[var(--border-subtle)] h-14 ${i % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-secondary)]'}`}>
                <td className="py-0 px-4 h-14 align-middle">
                  <button
                    type="button"
                    onClick={() => onFeatureClick(row.featureKey)}
                    className="text-start text-[var(--brand)] font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2 rounded px-1 -ms-1"
                    aria-label={t('billing.compareFeature')}
                  >
                    {t(`billing.${row.featureKey}`)}
                  </button>
                </td>
                <td className="text-center py-0 px-4 h-14 align-middle">
                  <div className="flex justify-center items-center">
                    <Cell value={row.free} unlimited={t('billing.compareUnlimited')} t={t} />
                  </div>
                </td>
                <td className="py-0 px-4 h-14 align-middle">
                  <div className="flex justify-center items-center">
                    <Cell value={row.pro} unlimited={t('billing.compareUnlimited')} t={t} />
                  </div>
                </td>
                <td className="py-0 px-4 h-14 align-middle">
                  <div className="flex justify-center items-center font-medium">
                    <Cell value={row.ultra} unlimited={t('billing.compareUnlimited')} t={t} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
