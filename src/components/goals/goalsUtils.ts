import { Home, Car, Umbrella, TrendingUp, Compass, Target } from 'lucide-react';

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
  if (!deadline) return '—';
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
  if (!deadline) return '—';
  return new Date(deadline).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}
