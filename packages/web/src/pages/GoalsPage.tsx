import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Target, Plus, TrendingUp, AlertTriangle, CheckCircle2, Flame, Wallet } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/shared/EmptyState';
import { GoalFormModal } from '../components/features/goals/GoalFormModal';
import { GoalAmountModal } from '../components/features/goals/GoalAmountModal';
import { GoalsActiveList, GoalsCompletedSection } from '../components/features/goals';
import { useGoalsPage } from '../hooks/useGoalsPage';
import { getGoalHealth, getMonthlyNeeded, formatMoney } from '../components/features/goals/goalsUtils';
import { GoalsInsights } from '../components/features/goals/GoalsInsights';
import type { GoalRecord } from '../hooks/useGoals';

export type { GoalRecord } from '../hooks/useGoals';

// ── Mini ring for the hero ────────────────────────────────────────────────────
const HERO_R    = 44;
const HERO_CIRC = 2 * Math.PI * HERO_R;

function HeroRing({ percent }: { percent: number }) {
  const dashOff = HERO_CIRC * (1 - Math.min(100, percent) / 100);
  const color   = percent >= 70 ? '#34d399' : percent >= 40 ? '#fbbf24' : '#f87171';

  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={HERO_R} fill="none" stroke="var(--border)" strokeWidth="8" />
        <motion.circle
          cx="50" cy="50" r={HERO_R} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={HERO_CIRC}
          initial={{ strokeDashoffset: HERO_CIRC }}
          animate={{ strokeDashoffset: dashOff }}
          transition={{ duration: 1.3, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Target className="w-5 h-5 mb-0.5" style={{ color }} />
        <span className="text-lg font-bold tabular-nums text-[var(--text-primary)] leading-none">
          {Math.round(percent)}%
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">overall</span>
      </div>
    </div>
  );
}

// ── Goals Dashboard Hero ──────────────────────────────────────────────────────
function GoalsDashboard({
  goals, currentWealth, locale, t, isAr, onAdd,
}: {
  goals: GoalRecord[];
  currentWealth: number;
  locale: string;
  t: (key: string, opts?: object) => string;
  isAr: boolean;
  onAdd: () => void;
}) {
  const totalTarget  = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved   = goals.reduce((s, g) => s + g.currentAmount, 0);
  const overallPct   = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  const totalNeeded  = Math.max(0, totalTarget - totalSaved);

  const healthCounts = goals.reduce(
    (acc, g) => {
      const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
      acc[getGoalHealth(pct, g.deadline, g.createdAt)]++;
      return acc;
    },
    { 'on-track': 0, behind: 0, critical: 0 } as Record<string, number>,
  );

  // Total monthly commitment across all active goals
  const totalMonthly = goals.reduce((s, g) => {
    const mn = getMonthlyNeeded(g.targetAmount, g.currentAmount, g.deadline);
    return s + (mn ?? 0);
  }, 0);

  const portfolioCoversPct = totalTarget > 0 ? Math.min(100, (currentWealth / totalTarget) * 100) : 0;

  const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
  const stagger = { show: { transition: { staggerChildren: 0.07 } } };

  return (
    <motion.div
      variants={stagger} initial="hidden" animate="show"
      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden"
    >
      {/* Top gradient bar */}
      <div className="h-1 w-full bg-gradient-to-r from-[var(--brand)] via-violet-500 to-indigo-500" />

      <div className="p-5 space-y-5">
        {/* Title row */}
        <motion.div variants={fadeUp} className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-[var(--text-primary)]">{t('goals.title')}</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {goals.length} {t('goals.activeCount')}
            </p>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('goals.addNew')}
          </motion.button>
        </motion.div>

        {/* Main stats row */}
        <motion.div variants={fadeUp} className="flex items-center gap-5">
          <HeroRing percent={overallPct} />

          <div className="flex-1 space-y-3 min-w-0">
            {/* Saved vs Target */}
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">{isAr ? 'الإجمالي المدخر' : 'Total Saved'}</p>
              <p className="text-xl font-bold tabular-nums text-emerald-400 leading-none">
                {formatMoney(totalSaved, locale)}
                <span className="text-sm font-medium text-[var(--text-muted)] ms-1">{t('goals.currency')}</span>
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {isAr ? 'من' : 'of'} {formatMoney(totalTarget, locale)} {t('goals.currency')}
              </p>
            </div>

            {/* Health badges row */}
            <div className="flex flex-wrap gap-2">
              {healthCounts['on-track'] > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                  <CheckCircle2 className="w-3 h-3" />
                  {healthCounts['on-track']} {isAr ? 'في الموعد' : 'On Track'}
                </span>
              )}
              {healthCounts['behind'] > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  <AlertTriangle className="w-3 h-3" />
                  {healthCounts['behind']} {isAr ? 'متأخر' : 'Behind'}
                </span>
              )}
              {healthCounts['critical'] > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/20">
                  <Flame className="w-3 h-3" />
                  {healthCounts['critical']} {isAr ? 'حرج' : 'Critical'}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Bottom stats grid */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--border)]">
          {/* Still needed */}
          <div className="text-center">
            <p className="text-[10px] text-[var(--text-muted)] mb-1">{isAr ? 'متبقي' : 'Still Need'}</p>
            <p className="text-sm font-bold tabular-nums text-[var(--text-primary)]">
              {formatMoney(totalNeeded, locale)}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">{t('goals.currency')}</p>
          </div>

          {/* Monthly commitment */}
          <div className="text-center border-x border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-muted)] mb-1">{isAr ? 'التزام شهري' : 'Monthly Need'}</p>
            <p className="text-sm font-bold tabular-nums text-[var(--brand)]">
              {formatMoney(totalMonthly, locale)}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">{t('goals.currency')}/{isAr ? 'شهر' : 'mo'}</p>
          </div>

          {/* Portfolio coverage */}
          <div className="text-center">
            <p className="text-[10px] text-[var(--text-muted)] mb-1">{isAr ? 'تغطية المحفظة' : 'Portfolio Covers'}</p>
            <p className="text-sm font-bold tabular-nums text-violet-400">
              {Math.round(portfolioCoversPct)}%
            </p>
            <div className="w-full h-1 bg-[var(--border)] rounded-full mt-1.5">
              <motion.div
                className="h-full bg-violet-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${portfolioCoversPct}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Portfolio note */}
        {currentWealth > 0 && (
          <motion.div variants={fadeUp} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
            <Wallet className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
            <p className="text-xs text-[var(--text-muted)]">
              {t('goals.portfolioAvailable')}:{' '}
              <span className="font-bold text-[var(--text-primary)]">
                {formatMoney(currentWealth, locale)} {t('goals.currency')}
              </span>
              {totalTarget > 0 && (
                <span className="ms-1 text-violet-400 font-semibold">
                  ({Math.round(portfolioCoversPct)}% {isAr ? 'من أهدافك' : 'of your goals'})
                </span>
              )}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GoalsPage({ currentWealth = 0 }: { currentWealth?: number }) {
  const { t, i18n } = useTranslation('common');
  const isAr = i18n.language?.startsWith('ar');

  const {
    goalsData, addModalOpen, goalsLimitOpen, closeGoalsLimitModal,
    editModalOpen, editGoalId,
    amountModalOpen, amountGoal, menuOpenId, completedOpen, accessToken,
    openAddModal, closeAddModal, onSavedAdd,
    closeEditModal, onSavedEdit,
    closeAmountModal, onSavedAmount,
    toggleCompletedOpen, setMenuOpenIdFor,
    openAmountFor, openEditFor, deleteGoal, markComplete,
  } = useGoalsPage();

  const locale = i18n.language;

  if (goalsData.loading) {
    return (
      <div className="space-y-4 py-2">
        <Skeleton height={220} className="w-full rounded-2xl" />
        {[1, 2].map((i) => <Skeleton key={i} height={200} className="w-full rounded-2xl" />)}
      </div>
    );
  }

  const hasGoals = goalsData.goals.length > 0;

  return (
    <div className="space-y-5">

      {/* ── Dashboard Hero (always shown if goals exist) */}
      {hasGoals && (
        <GoalsDashboard
          goals={goalsData.activeGoals}
          currentWealth={currentWealth}
          locale={locale}
          t={t}
          isAr={isAr}
          onAdd={openAddModal}
        />
      )}

      {/* ── Empty state */}
      {!hasGoals && (
        <EmptyState
          icon={Target}
          title={t('goals.emptyTitle')}
          description={t('goals.emptyDescription')}
          actionLabel={t('goals.addFirst')}
          onAction={openAddModal}
        />
      )}

      {/* ── Smart Insights: conflict detector + split calculator */}
      {goalsData.activeGoals.length > 0 && (
        <GoalsInsights
          goals={goalsData.activeGoals}
          locale={locale}
          t={t}
          isAr={isAr}
        />
      )}

      {/* ── Active Goals */}
      <GoalsActiveList
        goals={goalsData.activeGoals}
        locale={locale}
        t={t}
        menuOpenId={menuOpenId}
        onMenuToggle={setMenuOpenIdFor}
        onUpdateAmount={openAmountFor}
        onEdit={openEditFor}
        onDelete={deleteGoal}
        onMarkComplete={markComplete}
        onAdd={openAddModal}
        isAr={isAr}
      />

      {/* ── Completed Goals */}
      <GoalsCompletedSection
        goals={goalsData.completedGoals}
        expanded={completedOpen}
        onToggle={toggleCompletedOpen}
        locale={locale}
        t={t as (key: string, opts?: object) => string}
      />

      {goalsData.error && (
        <p className="text-sm text-[var(--danger)] bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-xl p-3">
          {goalsData.error}
        </p>
      )}

      {/* ── Modals */}
      {/* ── Goals Limit Modal */}
      {goalsLimitOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={closeGoalsLimitModal}
        >
          <div
            className="bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-sm w-full p-6 text-center border border-[var(--border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-[var(--text-secondary)] mb-6">{t('plan.goalsLimitMessage')}</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => {
                  closeGoalsLimitModal();
                  window.dispatchEvent(new CustomEvent('navigate-to-subscription'));
                }}
                className="px-4 py-2 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-sm font-semibold transition-colors"
              >
                {t('plan.subscribeNow')}
              </button>
              <button
                type="button"
                onClick={closeGoalsLimitModal}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                {t('plan.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <GoalFormModal open={addModalOpen} onClose={closeAddModal} onSaved={onSavedAdd}
        accessToken={accessToken} t={t as (key: string, opts?: object) => string} mode="add" />
      <GoalFormModal open={editModalOpen} onClose={closeEditModal} onSaved={onSavedEdit}
        accessToken={accessToken} t={t as (key: string, opts?: object) => string} mode="edit"
        goalId={editGoalId}
        initialGoal={editGoalId ? goalsData.goals.find((g) => g.id === editGoalId) ?? undefined : undefined} />
      <GoalAmountModal open={amountModalOpen} goal={amountGoal}
        onClose={closeAmountModal} onSaved={onSavedAmount}
        accessToken={accessToken} t={t as (key: string, opts?: object) => string} locale={locale} />
    </div>
  );
}
