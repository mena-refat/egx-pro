import type { Ticket } from './types';

export const fmt = (n: number) => Number(n.toFixed(1)).toString();

export function isOverdue(tk: Ticket): boolean {
  if (tk.status !== 'OPEN' && tk.status !== 'IN_PROGRESS') return false;
  if (tk.reply) return false;
  return Date.now() - new Date(tk.createdAt).getTime() > 24 * 60 * 60 * 1000;
}

export function timeAgo(date: string, locale = 'en') {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  return rtf.format(-Math.round(diff / 86400), 'day');
}

export function userInitial(user: Ticket['user'] | null | undefined) {
  return (user?.fullName?.[0] ?? user?.username?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();
}

export function resolveColor(rate: number) {
  return rate >= 80 ? 'text-emerald-400' : rate >= 50 ? 'text-amber-400' : 'text-red-400';
}

export function responseColor(h: number | null) {
  if (h === null) return 'text-slate-500';
  return h <= 2 ? 'text-emerald-400' : h <= 6 ? 'text-amber-400' : 'text-red-400';
}

export const STATUS_BAR: Record<string, string> = {
  OPEN: 'bg-blue-500',
  IN_PROGRESS: 'bg-amber-500',
  RESOLVED: 'bg-emerald-500',
  CLOSED: 'bg-slate-600',
};

export const PRIORITY_DOT: Record<string, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-400',
  NORMAL: 'bg-slate-500',
  LOW: 'bg-slate-700',
};

export const PRIORITY_TEXT: Record<string, string> = {
  URGENT: 'text-red-400',
  HIGH: 'text-orange-400',
  NORMAL: 'text-slate-400',
  LOW: 'text-slate-600',
};

export const PRIORITY_KEY: Record<string, string> = {
  URGENT: 'support.priorityUrgent',
  HIGH: 'support.priorityHigh',
  NORMAL: 'support.priorityNormal',
  LOW: 'support.priorityLow',
};
