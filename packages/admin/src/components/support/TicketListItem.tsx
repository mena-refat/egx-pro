import { Star, AlertTriangle, ArrowUpCircle, Clock } from 'lucide-react';
import { Badge } from '../Badge';
import type { Ticket } from './types';
import { STATUS_BAR, PRIORITY_DOT, PRIORITY_TEXT, PRIORITY_KEY, CAT_BADGE, isOverdue, timeAgo, userInitial } from './helpers';

interface TicketListItemProps {
  tk: Ticket;
  isSelected: boolean;
  managerMode: boolean;
  isChecked: boolean;
  locale: string;
  t: (k: string) => string;
  onSelect: () => void;
  onCheck: (checked: boolean) => void;
}

export function TicketListItem({ tk, isSelected, managerMode, isChecked, locale, t, onSelect, onCheck }: TicketListItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-start flex items-stretch gap-0 rounded-xl border transition-all overflow-hidden group ${
        isSelected
          ? 'border-blue-500/35 bg-blue-500/[0.04]'
          : 'border-white/[0.06] bg-[#111118] hover:border-white/[0.12] hover:bg-white/[0.015]'
      }`}
    >
      <div className={`w-1 shrink-0 ${STATUS_BAR[tk.status] ?? 'bg-slate-600'}`} />

      <div className="flex-1 px-3.5 py-3 min-w-0">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-700/60 to-slate-800/60 border border-white/[0.07] flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0 mt-0.5">
            {userInitial(tk.user)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  {managerMode && (
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={!!tk.assignedTo}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onCheck(e.target.checked)}
                      className="w-3 h-3 rounded accent-blue-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  )}
                  <p className="text-xs font-semibold text-white truncate">{tk.subject}</p>
                </div>
                <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                  <span>{tk.user?.fullName ?? tk.user?.username ?? tk.user?.email ?? '—'}</span>
                  {(tk.user?.plan === 'ultra' || tk.user?.plan === 'ultra_yearly') && (
                    <span className="inline-flex shrink-0 items-center px-1.5 py-px rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20 text-[9px] font-bold tracking-wide">
                      ULTRA
                    </span>
                  )}
                  {(tk.user?.plan === 'pro' || tk.user?.plan === 'yearly') && (
                    <span className="inline-flex shrink-0 items-center px-1.5 py-px rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold tracking-wide">
                      PRO
                    </span>
                  )}
                  <span className="text-slate-700"> · </span>
                  <span className="truncate">{tk.message}</span>
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1.5">
                <span className="text-[10px] text-slate-600 whitespace-nowrap">{timeAgo(tk.createdAt, locale)}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[tk.priority] ?? 'bg-slate-600'}`} title={tk.priority} />
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge label={tk.status} />
              <span className={`text-[10px] font-medium ${PRIORITY_TEXT[tk.priority] ?? 'text-slate-500'}`}>
                {PRIORITY_KEY[tk.priority] ? t(PRIORITY_KEY[tk.priority]) : tk.priority}
              </span>
              {tk.category && CAT_BADGE[tk.category] && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${CAT_BADGE[tk.category].cls}`}>
                  {CAT_BADGE[tk.category].label}
                </span>
              )}
              {tk.assignedAgent ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/15">
                  {tk.assignedAgent.fullName || tk.assignedAgent.email}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/15 flex items-center gap-0.5">
                  <AlertTriangle size={8} /> {t('support.unassigned')}
                </span>
              )}
              {tk.rating && (
                <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                  <Star size={9} fill="currentColor" /> {tk.rating}
                </span>
              )}
              {tk.escalatedAt && (
                tk.escalatedByAdmin?.role === 'SUPER_ADMIN' ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 flex items-center gap-0.5 font-semibold">
                    <ArrowUpCircle size={8} /> {t('support.escalatedBySuperAdmin')}
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/15 flex items-center gap-0.5">
                    <ArrowUpCircle size={8} /> {t('support.escalatedBadge')}
                  </span>
                )
              )}
              {isOverdue(tk) && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-600/15 text-red-400 border border-red-600/20 flex items-center gap-0.5 font-semibold">
                  <Clock size={8} /> {t('support.overdue')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
