import React from 'react';
import {
  Clock, CheckCircle2, XCircle, AlertCircle, Ban,
} from 'lucide-react';

export type TicketStatus   = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  reply?: string | null;
  repliedAt?: string | null;
  replyRead: boolean;
  rating?: number | null;
  ratedAt?: string | null;
  createdAt: string;
}

export const STATUS_CFG: Record<TicketStatus, { label_en: string; label_ar: string; color: string; icon: React.ElementType }> = {
  OPEN:        { label_en: 'Open',        label_ar: 'مفتوحة',        color: 'text-blue-500   bg-blue-500/10',   icon: Clock        },
  IN_PROGRESS: { label_en: 'In Progress', label_ar: 'قيد المعالجة', color: 'text-yellow-500 bg-yellow-500/10', icon: AlertCircle  },
  RESOLVED:    { label_en: 'Resolved',    label_ar: 'محلولة',        color: 'text-green-500  bg-green-500/10',  icon: CheckCircle2 },
  CLOSED:      { label_en: 'Closed',      label_ar: 'مغلقة',         color: 'text-[var(--text-muted)] bg-[var(--bg-card-hover)]', icon: XCircle     },
  CANCELLED:   { label_en: 'Cancelled',   label_ar: 'ملغية',         color: 'text-red-400    bg-red-400/10',    icon: Ban          },
};

export function relativeTime(dateStr: string, isAr: boolean): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return isAr ? 'الآن' : 'just now';
  if (mins  < 60) return isAr ? `منذ ${mins} دقيقة`  : `${mins}m ago`;
  if (hours < 24) return isAr ? `منذ ${hours} ساعة`  : `${hours}h ago`;
  if (days  < 7)  return isAr ? `منذ ${days} أيام`   : `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function StatusBadge({ status, isAr }: { status: TicketStatus; isAr: boolean }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {isAr ? cfg.label_ar : cfg.label_en}
    </span>
  );
}
