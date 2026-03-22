import { Home, Car, Umbrella, TrendingUp, Compass, Target } from 'lucide-react';

// ── Smart goal intelligence ──────────────────────────────────────────────────

export type GoalHealth = 'on-track' | 'behind' | 'critical';

/**
 * Compares actual progress % against expected % based on elapsed time.
 * Returns the health status of the goal.
 */
export function getGoalHealth(
  percent: number,
  deadline: string | null,
  createdAt: string,
): GoalHealth {
  if (!deadline) return percent >= 50 ? 'on-track' : 'behind';

  const now  = new Date();
  const end  = new Date(deadline);
  const start = new Date(createdAt);

  // Past deadline and not complete → critical
  if (end <= now && percent < 100) return 'critical';

  const totalMs   = end.getTime() - start.getTime();
  const elapsedMs = Math.max(0, now.getTime() - start.getTime());
  if (totalMs <= 0) return 'critical';

  // What % of time has elapsed → expected savings pace
  const expectedPercent = Math.min(100, (elapsedMs / totalMs) * 100);
  const gap = expectedPercent - percent; // positive = behind schedule

  if (gap <= 0)  return 'on-track';  // ahead of or equal to pace
  if (gap <= 20) return 'behind';    // slightly behind
  return 'critical';                 // significantly behind
}

/**
 * How much needs to be saved per month to hit the target by the deadline.
 * Returns null if deadline is in the past or not set.
 */
// ── Smart split calculator ────────────────────────────────────────────────────

export interface SplitResult {
  goalId:          string;
  title:           string;
  monthlyNeeded:   number;
  allocation:      number;   // what we give from the budget
  coveragePct:     number;   // allocation / monthlyNeeded (0-100)
  fullyFunded:     boolean;
  newMonthsLeft:   number | null; // projected months with this allocation
  remaining:       number;
}

/**
 * Given a monthly savings budget, distribute it proportionally
 * across active goals by their required monthly savings.
 * Fully-funded goals get exactly what they need; the rest share the surplus.
 */
export function computeOptimalSplit(
  goals: Array<{
    id: string; title: string;
    targetAmount: number; currentAmount: number; deadline: string | null;
  }>,
  monthlyBudget: number,
): SplitResult[] {
  const active = goals
    .map((g) => {
      const remaining     = Math.max(0, g.targetAmount - g.currentAmount);
      const monthlyNeeded = remaining > 0
        ? (getMonthlyNeeded(g.targetAmount, g.currentAmount, g.deadline) ?? 0)
        : 0;
      return { g, remaining, monthlyNeeded };
    })
    .filter((x) => x.remaining > 0);

  if (!active.length) return [];

  const totalNeeded = active.reduce((s, x) => s + x.monthlyNeeded, 0);

  return active.map(({ g, remaining, monthlyNeeded }) => {
    const rawShare   = totalNeeded > 0
      ? (monthlyNeeded / totalNeeded) * monthlyBudget
      : monthlyBudget / active.length;
    const allocation  = Math.round(rawShare);
    const fullyFunded = allocation >= monthlyNeeded && monthlyNeeded > 0;
    const coveragePct = monthlyNeeded > 0
      ? Math.min(100, (allocation / monthlyNeeded) * 100)
      : 100;
    const newMonthsLeft = allocation > 0 && !fullyFunded
      ? Math.ceil(remaining / allocation)
      : null;

    return {
      goalId: g.id, title: g.title,
      monthlyNeeded, allocation, coveragePct,
      fullyFunded, newMonthsLeft, remaining,
    };
  });
}

// ── Priority ranking ──────────────────────────────────────────────────────────

/**
 * Returns goals sorted by urgency:
 *  1. Critical health + soonest deadline
 *  2. Behind health + soonest deadline
 *  3. On-track + soonest deadline
 */
export function rankGoalsByPriority<T extends {
  targetAmount: number; currentAmount: number;
  deadline: string | null; createdAt: string;
}>(goals: T[]): T[] {
  const healthOrder: Record<GoalHealth, number> = { critical: 0, behind: 1, 'on-track': 2 };
  return [...goals].sort((a, b) => {
    const pA = a.targetAmount > 0 ? Math.min(100, (a.currentAmount / a.targetAmount) * 100) : 0;
    const pB = b.targetAmount > 0 ? Math.min(100, (b.currentAmount / b.targetAmount) * 100) : 0;
    const hA = healthOrder[getGoalHealth(pA, a.deadline, a.createdAt)];
    const hB = healthOrder[getGoalHealth(pB, b.deadline, b.createdAt)];
    if (hA !== hB) return hA - hB;
    const dA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const dB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return dA - dB;
  });
}

export function getMonthlyNeeded(
  targetAmount: number,
  currentAmount: number,
  deadline: string | null,
): number | null {
  if (!deadline) return null;
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return 0;
  const monthsLeft = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44);
  if (monthsLeft <= 0) return null;
  return Math.ceil(remaining / monthsLeft);
}

export const GOAL_CATEGORIES = [
  { id: 'home', icon: Home },
  { id: 'car', icon: Car },
  { id: 'retirement', icon: Umbrella },
  { id: 'wealth', icon: TrendingUp },
  { id: 'travel', icon: Compass },
  { id: 'other', icon: Target },
] as const;

export function formatMoney(n: number, locale: string): string {
  return n.toLocaleString(locale, { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

export function formatWithCommas(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits === '') return '';
  return Number(digits).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function getProgressColor(percent: number): string {
  if (percent >= 100) return 'bg-[var(--success)]';
  if (percent >= 61) return 'bg-[var(--brand)]';
  if (percent >= 31) return 'bg-[var(--warning)]';
  return 'bg-[var(--danger)]';
}

export function formatTimeLeft(
  deadline: string | null,
  t: (key: string, opts?: object) => string,
  locale: string
): string {
  if (!deadline) return '-';
  const end = new Date(deadline);
  const now = new Date();
  if (end.getTime() <= now.getTime()) return t('goals.daysLeft', { d: 0 });
  const months = Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  const days = Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (months >= 12) {
    const y = Math.floor(months / 12);
    const m = months % 12;
    const yearKey = y === 1 ? 'goals.yearOne' : 'goals.yearMany';
    return `${y} ${t(yearKey)} ${t('goals.andMonths', { m })}`;
  }
  if (months >= 1) return t('goals.monthsLeft', { m: months });
  return t('goals.daysLeft', { d: days });
}

export function formatDeadline(deadline: string | null, locale: string): string {
  if (!deadline) return '-';
  return new Date(deadline).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}
