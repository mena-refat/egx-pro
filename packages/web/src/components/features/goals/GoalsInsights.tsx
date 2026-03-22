import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, Flame,
  ArrowRight, Lightbulb,
} from 'lucide-react';
import type { GoalRecord } from '../../../hooks/useGoals';
import {
  computeOptimalSplit, rankGoalsByPriority,
  getGoalHealth, formatMoney, formatWithCommas,
  type GoalHealth,
} from './goalsUtils';

// ── helpers ───────────────────────────────────────────────────────────────────

const HEALTH_ICON: Record<GoalHealth, React.ComponentType<{ className?: string }>> = {
  'on-track': CheckCircle2,
  behind:     AlertTriangle,
  critical:   Flame,
};

const HEALTH_LABEL_AR: Record<GoalHealth, string> = {
  'on-track': 'في الموعد',
  behind:     'يحتاج اهتمام',
  critical:   'يستحق التركيز الآن',
};

const HEALTH_COLOR: Record<GoalHealth, string> = {
  'on-track': 'text-emerald-400',
  behind:     'text-amber-400',
  critical:   'text-red-400',
};

const HEALTH_BAR: Record<GoalHealth, string> = {
  'on-track': 'bg-emerald-400',
  behind:     'bg-amber-400',
  critical:   'bg-red-400',
};

// ── priority insight ──────────────────────────────────────────────────────────

function PriorityInsight({
  goals, locale, t, isAr,
}: {
  goals: GoalRecord[];
  locale: string;
  t: (k: string, o?: object) => string;
  isAr: boolean;
}) {
  if (goals.length < 2) return null;

  const ranked  = rankGoalsByPriority(goals);
  const top     = ranked[0];
  const topPct  = top.targetAmount > 0 ? Math.min(100, (top.currentAmount / top.targetAmount) * 100) : 0;
  const topH    = getGoalHealth(topPct, top.deadline, top.createdAt);
  const TopIcon = HEALTH_ICON[topH];

  // Show insight only when there's at least one goal needing attention
  const hasUrgent = ranked.some((g) => {
    const p = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
    return getGoalHealth(p, g.deadline, g.createdAt) !== 'on-track';
  });
  if (!hasUrgent) return null;

  // Build a motivational reason why this goal is top priority
  const reason = topH === 'critical'
    ? (isAr ? 'موعده قريب وتقدمه يحتاج دفعة قوية دلوقتي' : 'Deadline is close and needs a strong push')
    : (isAr ? 'تقدمه شوية أبطأ من المتوقع، وانت قادر تعوّضه بسهولة' : 'Slightly behind pace — easy to catch up');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-4 rounded-2xl bg-[var(--brand)]/6 border border-[var(--brand)]/20"
    >
      <div className="w-9 h-9 rounded-xl bg-[var(--brand)]/12 flex items-center justify-center shrink-0 mt-0.5">
        <Lightbulb className="w-4 h-4 text-[var(--brand)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-[var(--brand)] mb-1">
          {isAr ? 'أولويتك الذكية دلوقتي' : 'Your Smart Priority'}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <TopIcon className={`w-3.5 h-3.5 shrink-0 ${HEALTH_COLOR[topH]}`} />
          <p className="text-sm font-bold text-[var(--text-primary)] truncate">{top.title}</p>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{reason}</p>

        {/* Priority list */}
        {ranked.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ranked.map((g, i) => {
              const p  = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
              const h  = getGoalHealth(p, g.deadline, g.createdAt);
              const GIcon = HEALTH_ICON[h];
              return (
                <span
                  key={g.id}
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border
                    ${i === 0
                      ? 'bg-[var(--brand)]/10 border-[var(--brand)]/25 text-[var(--brand)]'
                      : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-muted)]'
                    }`}
                >
                  <span className="opacity-60">#{i + 1}</span>
                  <GIcon className={`w-2.5 h-2.5 ${HEALTH_COLOR[h]}`} />
                  {g.title}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── split calculator ──────────────────────────────────────────────────────────

function SplitCalculator({
  goals, locale, t, isAr,
}: {
  goals: GoalRecord[];
  locale: string;
  t: (k: string, o?: object) => string;
  isAr: boolean;
}) {
  const [rawInput, setRawInput]   = useState('');
  const [open, setOpen]           = useState(false);

  const budget  = parseInt(rawInput.replace(/,/g, ''), 10) || 0;
  const results = useMemo(
    () => (budget > 0 ? computeOptimalSplit(goals, budget) : []),
    [goals, budget],
  );

  const totalNeeded  = results.reduce((s, r) => s + r.monthlyNeeded, 0);
  const totalAlloc   = results.reduce((s, r) => s + r.allocation, 0);
  const surplus      = budget - totalNeeded;
  const allFunded    = results.every((r) => r.fullyFunded);
  const anyUnderfund = results.some((r) => !r.fullyFunded);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-[var(--bg-card-hover)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[var(--brand)]" />
          </div>
          <div className="text-start">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {isAr ? 'وزّع مدخراتك بذكاء' : 'Smart Savings Split'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {isAr ? 'اكتب مبلغك الشهري — نوزعه صح' : 'Enter your monthly savings — we split it right'}
            </p>
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          : <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
        }
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4 pt-1 space-y-4 border-t border-[var(--border)]">

              {/* Input */}
              <div className="mt-3">
                <label className="text-xs text-[var(--text-muted)] mb-1.5 block">
                  {isAr ? 'كام بتقدر تدخر كل شهر؟' : 'How much can you save monthly?'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={rawInput}
                    onChange={(e) => setRawInput(formatWithCommas(e.target.value))}
                    placeholder="0"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--brand)] transition-colors"
                    dir="ltr"
                  />
                  <span className="absolute end-3 text-xs text-[var(--text-muted)] pointer-events-none">
                    {t('goals.currency')}
                  </span>
                </div>
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className="space-y-3">

                  {/* Summary banner */}
                  <div className={`rounded-xl px-3.5 py-2.5 text-xs font-medium ${
                    allFunded
                      ? 'bg-emerald-400/8 border border-emerald-400/20 text-emerald-400'
                      : anyUnderfund
                        ? 'bg-amber-400/8 border border-amber-400/20 text-amber-400'
                        : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)]'
                  }`}>
                    {allFunded && surplus >= 0 ? (
                      <span>
                        {isAr
                          ? `✅ مبلغك يكفي لكل أهدافك${surplus > 0 ? ` — ومتبقيلك ${formatMoney(surplus, locale)} ${t('goals.currency')} فائض` : ''}`
                          : `✅ Your budget covers all goals${surplus > 0 ? ` — ${formatMoney(surplus, locale)} surplus` : ''}`
                        }
                      </span>
                    ) : (
                      <span>
                        {isAr
                          ? `⚡ بتغطي ${formatMoney(totalAlloc, locale)} من ${formatMoney(totalNeeded, locale)} ${t('goals.currency')} المطلوب — التوزيع دا هو الأذكى`
                          : `⚡ Covering ${formatMoney(totalAlloc, locale)} of ${formatMoney(totalNeeded, locale)} ${t('goals.currency')} needed — this is the smartest split`
                        }
                      </span>
                    )}
                  </div>

                  {/* Per-goal allocation bars */}
                  <div className="space-y-3">
                    {results.map((r) => {
                      const h = (() => {
                        const goal = goals.find(g => g.id === r.goalId);
                        if (!goal) return 'on-track' as GoalHealth;
                        const p = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
                        return getGoalHealth(p, goal.deadline, goal.createdAt);
                      })();

                      return (
                        <div key={r.goalId} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {React.createElement(HEALTH_ICON[h], { className: `w-3 h-3 shrink-0 ${HEALTH_COLOR[h]}` })}
                              <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{r.title}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs font-bold tabular-nums text-[var(--text-primary)]">
                                {formatMoney(r.allocation, locale)}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)]">{t('goals.currency')}</span>
                              {r.fullyFunded && (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 ms-0.5" />
                              )}
                            </div>
                          </div>

                          {/* Coverage bar */}
                          <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${HEALTH_BAR[h]}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${r.coveragePct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                            />
                          </div>

                          {/* Sub-label */}
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {r.fullyFunded ? (
                              isAr ? `يغطي المطلوب كاملاً — هدفك في الموعد ✓` : `Fully covered — on track ✓`
                            ) : r.newMonthsLeft !== null ? (
                              <span>
                                {isAr
                                  ? <>يغطي {Math.round(r.coveragePct)}% من المطلوب <ArrowIcon /> هتوصل في <strong className="text-[var(--text-secondary)]">{r.newMonthsLeft} شهر</strong></>
                                  : <>Covers {Math.round(r.coveragePct)}% of needed <ArrowIcon /> goal in <strong className="text-[var(--text-secondary)]">{r.newMonthsLeft} months</strong></>
                                }
                              </span>
                            ) : null}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Encouraging footer */}
                  <p className="text-[11px] text-[var(--text-muted)] text-center pt-1 leading-relaxed">
                    {allFunded
                      ? (isAr ? '🌟 محفظة أهدافك بتشتغل بكفاءة ممتازة' : '🌟 Your goals portfolio is running efficiently')
                      : (isAr
                          ? '💡 ثبّت على التوزيع ده وهتحقق أهدافك الواحد تلو الآخر بثقة'
                          : '💡 Stick to this split and you\'ll achieve your goals one by one with confidence'
                        )
                    }
                  </p>
                </div>
              )}

              {/* Empty state */}
              {budget > 0 && results.length === 0 && (
                <p className="text-xs text-center text-[var(--text-muted)] py-2">
                  {isAr ? 'مفيش أهداف نشطة دلوقتي' : 'No active goals to split'}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ArrowIcon() {
  return <ArrowRight className="w-3 h-3 inline mx-0.5 opacity-50" />;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function GoalsInsights({
  goals, locale, t, isAr,
}: {
  goals: GoalRecord[];
  locale: string;
  t: (k: string, o?: object) => string;
  isAr: boolean;
}) {
  if (goals.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-3"
    >
      <PriorityInsight goals={goals} locale={locale} t={t} isAr={isAr} />
      <SplitCalculator goals={goals} locale={locale} t={t} isAr={isAr} />
    </motion.div>
  );
}
