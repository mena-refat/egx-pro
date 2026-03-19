import React from 'react';
import { BrainCircuit, Zap, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import type { AnalysisResult } from '../../types';

export interface AnalysisFormProps {
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  onGetAnalysis: () => void;
  analysisPlan: { used: number; quota: number } | null;
  isPro: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export function AnalysisForm({
  analysis,
  loading,
  error,
  onGetAnalysis,
  analysisPlan,
  isPro,
  t,
}: AnalysisFormProps) {
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton height={48} className="w-48 rounded-lg" />
        <Skeleton height={256} className="w-full rounded-xl" />
        <Skeleton height={128} className="w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-2xl text-center">
        <p className="text-[var(--danger)] mb-4">{error}</p>
        <Button
          type="button"
          variant="secondary"
          onClick={onGetAnalysis}
          className="mx-auto border-[var(--danger)] text-[var(--danger)]"
        >
          <RefreshCw className="w-4 h-4" /> {t('stockDetail.retry')}
        </Button>
      </div>
    );
  }

  if (analysis) return null;

  return (
    <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-2xl">
      {!isPro && analysisPlan != null && Number.isFinite(analysisPlan.quota) && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 mb-6 max-w-md mx-auto">
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            {t('plan.usedAnalysisThisMonth', { used: analysisPlan.used, quota: analysisPlan.quota })}
          </p>
          <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <div
              className={`h-full transition-[width] ${
                analysisPlan.used >= analysisPlan.quota
                  ? 'bg-[var(--danger)]'
                  : analysisPlan.used >= 2
                    ? 'bg-[var(--warning)]'
                    : 'bg-[var(--brand)]'
              }`}
              style={{
                width: `${Math.min((analysisPlan.used / analysisPlan.quota) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}
      <BrainCircuit className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
      <h3 className="text-xl font-bold mb-2">{t('stockDetail.aiAnalysis')}</h3>
      <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
        {t('stockDetail.aiAnalysisDesc')}
      </p>
      <Button type="button" onClick={onGetAnalysis} className="mx-auto">
        <Zap className="w-4 h-4" /> {t('stockDetail.generateAnalysis')}
      </Button>
    </div>
  );
}
