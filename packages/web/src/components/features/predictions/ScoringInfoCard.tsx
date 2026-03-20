import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import {
  TIER_BASE_POINTS,
  TIMEFRAME_MULTIPLIER,
  TIMEFRAME_TIER_RANGES,
  TIER_ORDER,
  formatRange,
  calcPoints,
  type MoveTier,
  type PredictionTime,
} from '../../../lib/scoringConstants';

// ─── Static display config ────────────────────────────────────────────────────

const TIER_CONFIG: Record<MoveTier, {
  color: string; bg: string; border: string; gradFrom: string; ar: string; en: string;
}> = {
  LIGHT:   { color: 'text-sky-400',   bg: 'bg-sky-500/10',   border: 'border-sky-500/40',   gradFrom: 'from-sky-500/20',   ar: 'خفيف',   en: 'Light'   },
  MEDIUM:  { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/40', gradFrom: 'from-green-500/20', ar: 'متوسط',  en: 'Medium'  },
  STRONG:  { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/40', gradFrom: 'from-amber-500/20', ar: 'قوي',    en: 'Strong'  },
  EXTREME: { color: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/40',   gradFrom: 'from-red-500/20',   ar: 'متطرف',  en: 'Extreme' },
};

const TIMEFRAMES: PredictionTime[] = ['WEEK', 'MONTH', 'THREE_MONTHS', 'SIX_MONTHS', 'NINE_MONTHS', 'YEAR'];

const TF_LABEL: Record<PredictionTime, { ar: string; en: string; shortAr: string; shortEn: string }> = {
  WEEK:         { ar: 'أسبوع',  en: 'Week',     shortAr: 'أسبوع', shortEn: '1W' },
  MONTH:        { ar: 'شهر',    en: 'Month',    shortAr: 'شهر',   shortEn: '1M' },
  THREE_MONTHS: { ar: '3 شهور', en: '3 Months', shortAr: '3ش',    shortEn: '3M' },
  SIX_MONTHS:   { ar: '6 شهور', en: '6 Months', shortAr: '6ش',    shortEn: '6M' },
  NINE_MONTHS:  { ar: '9 شهور', en: '9 Months', shortAr: '9ش',    shortEn: '9M' },
  YEAR:         { ar: 'سنة',    en: 'Year',     shortAr: 'سنة',   shortEn: '1Y' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoringInfoCard({ onClose }: { onClose: () => void }) {
  const { i18n } = useTranslation('common');
  const isAr = i18n.language?.startsWith('ar');

  const [selectedTf, setSelectedTf]     = useState<PredictionTime>('THREE_MONTHS');
  const [selectedTier, setSelectedTier] = useState<MoveTier>('STRONG');

  const pts = calcPoints(selectedTier, selectedTf);
  const tfCfg = TIER_CONFIG[selectedTier];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="w-full sm:max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <Zap className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                {isAr ? 'كيف تُحسب النقاط؟' : 'How Points Work'}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] mt-px">
                {isAr ? 'مُعاير على 40 سنة من تاريخ البورصة المصرية' : 'Calibrated on 40 years of EGX history'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto max-h-[82vh] sm:max-h-[75vh]">
          <div className="p-5 space-y-5">

            {/* ── Section 1: Timeframe selector ── */}
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                {isAr ? 'اختر مدة التوقع لترى النطاقات' : 'Select timeframe to see ranges'}
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setSelectedTf(tf)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      selectedTf === tf
                        ? 'bg-[var(--brand)] text-white shadow-sm'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {isAr ? TF_LABEL[tf].ar : TF_LABEL[tf].en}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Section 2: 4-tier cards (interactive) ── */}
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                {isAr ? 'المراحل الأربعة — اضغط لترى المثال' : '4 Tiers — tap to see example'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TIER_ORDER.map((tier) => {
                  const cfg = TIER_CONFIG[tier];
                  const tierPts = calcPoints(tier, selectedTf);
                  const isSelected = selectedTier === tier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setSelectedTier(tier)}
                      className={`p-3 rounded-xl border-2 text-start transition-all ${
                        isSelected
                          ? `${cfg.bg} ${cfg.border}`
                          : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--border-subtle)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-bold ${cfg.color}`}>
                          {isAr ? cfg.ar : cfg.en}
                        </span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" style={{ color: 'inherit' }} />
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {formatRange(tier, selectedTf)}
                      </p>
                      <p className={`text-xs font-semibold mt-1.5 ${cfg.color}`}>
                        <Zap className="w-3 h-3 inline mb-px" /> {tierPts} {isAr ? 'نقطة' : 'pts'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Section 3: Interactive example ── */}
            <motion.div
              key={`${selectedTier}-${selectedTf}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border ${tfCfg.border} ${tfCfg.bg} p-4`}
            >
              <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-3">
                {isAr ? '⚡ مثال تفاعلي' : '⚡ Interactive Example'}
              </p>

              {/* Equation */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-[var(--text-muted)]">{isAr ? 'نقاط أساسية' : 'Base pts'}</span>
                  <span className={`text-xl font-black ${tfCfg.color}`}>{TIER_BASE_POINTS[selectedTier]}</span>
                </div>
                <span className="text-[var(--text-muted)] text-lg font-light">×</span>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-[var(--text-muted)]">{isAr ? 'مضاعف المدة' : 'Time multiplier'}</span>
                  <span className="text-xl font-black text-[var(--brand)]">{TIMEFRAME_MULTIPLIER[selectedTf].toFixed(1)}</span>
                </div>
                <span className="text-[var(--text-muted)] text-lg font-light">=</span>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-[var(--text-muted)]">{isAr ? 'إجمالي' : 'Total'}</span>
                  <span className="text-2xl font-black text-amber-400">{pts}</span>
                </div>
              </div>

              <div className="text-[11px] text-[var(--text-secondary)] space-y-1">
                <p>
                  {isAr ? (
                    <>
                      توقعت <span className={`font-bold ${tfCfg.color}`}>{tfCfg.ar}</span> ({formatRange(selectedTier, selectedTf)})
                      {' '}لمدة <span className="font-bold text-[var(--brand)]">{TF_LABEL[selectedTf].ar}</span>
                    </>
                  ) : (
                    <>
                      Predicted <span className={`font-bold ${tfCfg.color}`}>{tfCfg.en}</span> ({formatRange(selectedTier, selectedTf)})
                      {' '}for <span className="font-bold text-[var(--brand)]">{TF_LABEL[selectedTf].en}</span>
                    </>
                  )}
                </p>
                <p className="flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-green-400 shrink-0" />
                  {isAr
                    ? `لو تحقق → ${pts} نقطة`
                    : `If correct → ${pts} pts`}
                </p>
                <p className="flex items-center gap-1.5">
                  <TrendingDown className="w-3 h-3 text-amber-400 shrink-0" />
                  {isAr
                    ? `لو مرحلة مجاورة → ${Math.round(TIER_BASE_POINTS[selectedTier] * 0.25 * TIMEFRAME_MULTIPLIER[selectedTf])} نقطة`
                    : `Adjacent tier → ${Math.round(TIER_BASE_POINTS[selectedTier] * 0.25 * TIMEFRAME_MULTIPLIER[selectedTf])} pts`}
                </p>
              </div>
            </motion.div>

            {/* ── Section 4: Multipliers visual ── */}
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                {isAr ? 'مضاعفات الإطار الزمني' : 'Timeframe Multipliers'}
              </p>
              <div className="grid grid-cols-6 gap-1">
                {TIMEFRAMES.map((tf) => {
                  const mult = TIMEFRAME_MULTIPLIER[tf];
                  const isActive = selectedTf === tf;
                  return (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setSelectedTf(tf)}
                      className={`flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                        isActive
                          ? 'bg-[var(--brand)]/20 border border-[var(--brand)]/40'
                          : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)]'
                      }`}
                    >
                      <span className={`text-[10px] ${isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`}>
                        {isAr ? TF_LABEL[tf].shortAr : TF_LABEL[tf].shortEn}
                      </span>
                      <span className={`text-xs font-bold mt-0.5 ${isActive ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>
                        ×{mult.toFixed(1)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Section 5: Scoring rules ── */}
            <div className="rounded-xl bg-[var(--bg-secondary)] p-3 space-y-2">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {isAr ? 'قواعد التصحيح' : 'Scoring Rules'}
              </p>
              {[
                { icon: '✓', color: 'text-green-400', ar: 'اتجاه صح + مرحلة صح = نقاط كاملة', en: 'Right direction + exact tier = full points' },
                { icon: '≈', color: 'text-amber-400', ar: 'اتجاه صح + مرحلة مجاورة = 25% من النقاط', en: 'Right direction + adjacent tier = 25% of points' },
                { icon: '~', color: 'text-sky-400',   ar: 'اتجاه صح + بعيد جداً = 8% من النقاط',   en: 'Right direction + far off = 8% of points' },
                { icon: '✗', color: 'text-red-400',   ar: 'اتجاه غلط = -8 نقطة',                   en: 'Wrong direction = -8 pts' },
              ].map((rule) => (
                <div key={rule.icon} className="flex items-start gap-2 text-[11px]">
                  <span className={`font-bold ${rule.color} shrink-0 w-4 text-center mt-px`}>{rule.icon}</span>
                  <span className="text-[var(--text-secondary)]">{isAr ? rule.ar : rule.en}</span>
                </div>
              ))}
            </div>

            {/* ── Footer note ── */}
            <p className="text-[10px] text-center text-[var(--text-muted)] leading-relaxed">
              {isAr
                ? 'النطاقات محسوبة بناءً على متوسط تقلب 55٪ سنوياً للأسهم الفردية في EGX (بيانات 1986–2024). بعض الأسهم بتتجاوز ±10٪ في اليوم بعد التعليق أو أول يوم طرح.'
                : 'Ranges based on 55% average annual volatility for individual EGX stocks (1986–2024). Stocks may exceed ±10%/day after suspensions or on IPO day.'}
            </p>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
