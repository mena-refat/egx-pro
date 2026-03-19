import React from 'react';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { SupportTicket, StatusBadge, relativeTime } from './support.types';

/* ─── Stats Bar ────────────────────────────────────────────────────── */

export function StatsBar({ tickets, isAr }: { tickets: SupportTicket[]; isAr: boolean }) {
  const open       = tickets.filter(t => t.status === 'OPEN').length;
  const inProgress = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolved   = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const unread     = tickets.filter(t => t.reply && !t.replyRead).length;
  const active     = tickets.filter(t => t.status !== 'CANCELLED').length;

  const items = [
    { label: isAr ? 'الكل' : 'Total',            value: active,     color: 'text-[var(--text-primary)]' },
    { label: isAr ? 'مفتوحة' : 'Open',           value: open,       color: 'text-blue-500'              },
    { label: isAr ? 'معالجة' : 'Active',         value: inProgress, color: 'text-yellow-500'            },
    { label: isAr ? 'محلولة' : 'Resolved',       value: resolved,   color: 'text-green-500'             },
    { label: isAr ? 'ردود جديدة' : 'New replies', value: unread,    color: 'text-red-500'               },
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map(item => (
        <div key={item.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 text-center">
          <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Ticket Card ──────────────────────────────────────────────────── */

export const TicketCard: React.FC<{
  ticket: SupportTicket;
  isAr: boolean;
  onClick: () => void;
}> = ({ ticket, isAr, onClick }) => {
  const hasUnread = ticket.reply && !ticket.replyRead;

  return (
    <button
      onClick={onClick}
      className={`w-full text-start bg-[var(--bg-card)] border rounded-2xl p-4 hover:bg-[var(--bg-card-hover)] transition-all duration-200 group ${
        hasUnread ? 'border-red-400/50 shadow-sm shadow-red-500/10' : 'border-[var(--border)]'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`shrink-0 mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center ${
          hasUnread ? 'bg-red-500/10' : 'bg-[var(--bg-card-hover)]'
        }`}>
          <MessageSquare className={`w-4 h-4 ${hasUnread ? 'text-red-500' : 'text-[var(--text-muted)]'}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-sm text-[var(--text-primary)] truncate">{ticket.subject}</span>
            {hasUnread && (
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {isAr ? 'رد جديد' : 'New reply'}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] line-clamp-1 mb-2">{ticket.message}</p>
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} isAr={isAr} />
            <span className="text-xs text-[var(--text-muted)]">·</span>
            <span className="text-xs text-[var(--text-muted)]">{relativeTime(ticket.createdAt, isAr)}</span>
          </div>
        </div>

        {/* Arrow */}
        <ArrowLeft className={`shrink-0 w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors mt-1 ${isAr ? '' : 'rotate-180'}`} />
      </div>
    </button>
  );
};
