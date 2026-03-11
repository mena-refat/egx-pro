import React from 'react';
import { useTranslation } from 'react-i18next';
import type { LeaderboardEntry } from '../../../store/usePredictionsStore';

type Props = {
  entries: LeaderboardEntry[];
  loading: boolean;
};

export function PredictionsLeaderboardTab({ entries, loading }: Props) {
  const { t } = useTranslation('common');

  if (loading && entries.length === 0) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-[var(--bg-secondary)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return <p className="text-[var(--text-muted)] py-8 text-center">—</p>;
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li
          key={entry.userId}
          className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]"
        >
          <span className="font-bold text-[var(--text-muted)] w-8">#{entry.position}</span>
          <div className="w-8 h-8 rounded-full bg-[var(--brand)]/20 flex items-center justify-center text-sm font-medium">
            {(entry.user?.username ?? '?').slice(0, 1).toUpperCase()}
          </div>
          <span className="font-medium truncate flex-1">@{entry.user?.username ?? '—'}</span>
          <span className="text-sm text-[var(--text-muted)]">{(entry.accuracyRate ?? 0).toFixed(0)}%</span>
          <span className="text-sm font-medium">{entry.totalPoints} {t('predictions.pointsShort')}</span>
        </li>
      ))}
    </ul>
  );
}
