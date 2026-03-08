import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, ShieldAlert } from 'lucide-react';
import type { AnalysisResult as AnalysisResultType } from '../../types';

export interface AnalysisResultProps {
  analysis: AnalysisResultType;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export function AnalysisResult({ analysis, t }: AnalysisResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="p-6 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border)]">
        <p className="text-[var(--text-secondary)] leading-relaxed italic">&quot;{analysis.summary}&quot;</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[var(--brand)] font-bold">
            <BarChart3 className="w-5 h-5" /> {t('stockDetail.fundamental')}
          </div>
          <div className="text-sm text-[var(--text-muted)] space-y-2">
            <p>
              <span className="text-[var(--text-primary)] font-medium">Outlook:</span>{' '}
              {analysis.fundamental?.outlook}
            </p>
            <p>
              <span className="text-[var(--text-primary)] font-medium">Ratios:</span>{' '}
              {analysis.fundamental?.ratios}
            </p>
            <p className="text-[var(--success)] font-bold">
              Verdict: {analysis.fundamental?.verdict}
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[var(--brand)] font-bold">
            <TrendingUp className="w-5 h-5" /> {t('stockDetail.technical')}
          </div>
          <div className="text-sm text-[var(--text-muted)] space-y-2">
            <p>
              <span className="text-[var(--text-primary)] font-medium">Signal:</span>{' '}
              {analysis.technical?.signal}
            </p>
            <p>
              <span className="text-[var(--text-primary)] font-medium">Levels:</span>{' '}
              {analysis.technical?.levels}
            </p>
          </div>
        </div>
      </div>
      <div className="p-6 bg-[var(--bg-secondary)] rounded-2xl">
        <p className="text-[var(--text-secondary)] mb-4">{analysis.sentiment}</p>
        <div
          className={`text-2xl font-black ${
            analysis.verdict?.includes('Buy')
              ? 'text-[var(--success)]'
              : analysis.verdict?.includes('Sell')
                ? 'text-[var(--danger)]'
                : 'text-[var(--warning)]'
          }`}
        >
          {analysis.verdict}
        </div>
        <div className="flex justify-between mt-4 text-sm">
          <span className="text-[var(--danger)] font-bold">{analysis.priceTarget?.low}</span>
          <span className="font-bold text-[var(--text-primary)]">
            {analysis.priceTarget?.base}
          </span>
          <span className="text-[var(--success)] font-bold">{analysis.priceTarget?.high}</span>
        </div>
      </div>
      <div className="p-6 bg-[var(--danger-bg)] border border-[var(--danger)]/10 rounded-2xl">
        <div className="flex items-center gap-2 text-[var(--danger)] font-bold mb-2">
          <ShieldAlert className="w-4 h-4" /> {t('stockDetail.disclaimer')}
        </div>
        <p className="text-xs text-[var(--text-muted)]">{analysis.disclaimer}</p>
      </div>
    </motion.div>
  );
}
