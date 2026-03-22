import { useRef } from 'react';
import {
  X, UserCheck, ArrowUpCircle, Send, Zap, Star, Flag,
} from 'lucide-react';
import { Badge } from '../Badge';
import type { Ticket, QuickReply } from './types';
import { STATUS_BAR, PRIORITY_TEXT, PRIORITY_KEY, timeAgo, userInitial } from './helpers';

interface TicketDetailPanelProps {
  selected: Ticket;
  reply: string;
  newStatus: string;
  saving: boolean;
  replyError: string;
  canReply: boolean;
  canAssign: boolean;
  canEscalate: boolean;
  quickReplies: QuickReply[];
  showQRDropdown: boolean;
  currentAdminId?: number | string;
  locale: string;
  t: (k: string) => string;
  onClose: () => void;
  onReplyChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onSendReply: () => void;
  onAssignClick: () => void;
  onEscalateClick: () => void;
  onReportClick: () => void;
  onQRDropdownToggle: () => void;
  onQRSelect: (content: string) => void;
  qrDropdownRef: React.RefObject<HTMLDivElement | null>;
}

export function TicketDetailPanel({
  selected, reply, newStatus, saving, replyError,
  canReply, canAssign, canEscalate,
  quickReplies, showQRDropdown, currentAdminId,
  locale, t,
  onClose, onReplyChange, onStatusChange, onSendReply,
  onAssignClick, onEscalateClick, onReportClick,
  onQRDropdownToggle, onQRSelect, qrDropdownRef,
}: TicketDetailPanelProps) {
  const isClosedTicket = selected.status === 'RESOLVED' || selected.status === 'CLOSED';

  return (
    <div
      className="lg:sticky lg:top-4 self-start rounded-xl border border-white/[0.08] bg-[#111118] overflow-hidden flex flex-col"
      style={{ maxHeight: 'calc(100vh - 100px)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-white/[0.06] shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_BAR[selected.status] ?? 'bg-slate-500'}`} />
            <p className="text-sm font-bold text-white leading-snug truncate">{selected.subject}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap ms-4">
            <Badge label={selected.status} />
            <span className={`text-[10px] font-semibold ${PRIORITY_TEXT[selected.priority] ?? ''}`}>
              {PRIORITY_KEY[selected.priority] ? t(PRIORITY_KEY[selected.priority]) : selected.priority}
            </span>
            <span className="text-[10px] text-slate-600">
              {new Date(selected.createdAt).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close ticket panel"
          className="shrink-0 p-1 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all"
        >
          <X size={14} />
        </button>
      </div>

      {/* User + agent info */}
      <div className="px-4 py-2.5 border-b border-white/[0.05] bg-white/[0.015] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600/50 to-slate-700/50 border border-white/[0.08] flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
            {userInitial(selected.user)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-200 truncate">
              {selected.user?.fullName ?? selected.user?.username ?? '—'}
              <span className="text-slate-600 font-normal"> · {selected.user?.plan}</span>
            </p>
            {selected.user?.email && (
              <p className="text-[10px] text-slate-500 truncate">{selected.user.email}</p>
            )}
          </div>
          {selected.assignedAgent && (
            <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/15">
              <UserCheck size={10} className="text-blue-400" />
              <span className="text-[10px] text-blue-400 truncate max-w-[90px]">
                {selected.assignedAgent.fullName || selected.assignedAgent.email}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] text-slate-600 font-medium uppercase tracking-wide">{t('support.originalMessage')}</span>
            <div className="flex-1 h-px bg-white/[0.04]" />
            <span className="text-[10px] text-slate-600">{timeAgo(selected.createdAt, locale)}</span>
          </div>
          <div className="rounded-xl rounded-ss-sm bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
          </div>
        </div>

        {selected.reply && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="flex-1 h-px bg-white/[0.04]" />
              <span className="text-[10px] text-emerald-500/70 font-medium uppercase tracking-wide">{t('support.previousReply')}</span>
              {selected.repliedAt && (
                <span className="text-[10px] text-slate-600">{timeAgo(selected.repliedAt, locale)}</span>
              )}
            </div>
            <div className="rounded-xl rounded-se-sm bg-emerald-500/[0.06] border border-emerald-500/20 px-3 py-2.5 ms-6">
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selected.reply}</p>
              {selected.rating != null && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400 border-t border-white/[0.05] pt-2">
                  <Star size={9} fill="currentColor" /> {selected.rating}{t('support.ratingOutOf5')}
                </div>
              )}
            </div>
          </div>
        )}

        {selected.escalatedAt && (
          <div className="rounded-xl bg-orange-500/[0.05] border border-orange-500/20 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <ArrowUpCircle size={10} className="text-orange-400" />
              <span className="text-[10px] text-orange-400 font-medium">{t('support.escalatedBadge')}</span>
              <span className="ms-auto text-[10px] text-slate-600">{timeAgo(selected.escalatedAt, locale)}</span>
            </div>
            {selected.escalationNote && (
              <p className="text-xs text-slate-400 leading-relaxed">{selected.escalationNote}</p>
            )}
          </div>
        )}
      </div>

      {/* Actions + Reply */}
      <div className="border-t border-white/[0.06] px-4 py-3 space-y-2.5 shrink-0 bg-[#111118]">
        {(canAssign || canEscalate) && (
          <div className="flex gap-2">
            {canAssign && (
              <button
                onClick={onAssignClick}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-white/[0.08] text-slate-400 hover:text-blue-400 hover:border-blue-500/25 hover:bg-blue-500/[0.06] transition-all"
              >
                <UserCheck size={12} /> {t('support.assign')}
              </button>
            )}
            {canEscalate && selected.assignedTo === currentAdminId && !selected.escalatedAt &&
             (selected.status === 'OPEN' || selected.status === 'IN_PROGRESS') && (
              <button
                onClick={onEscalateClick}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-orange-500/20 text-orange-400 hover:bg-orange-500/10 transition-all"
              >
                <ArrowUpCircle size={12} /> {t('support.escalate')}
              </button>
            )}
            {canEscalate && selected.escalatedAt && (
              <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-orange-500/15 bg-orange-500/[0.05] text-orange-400">
                <ArrowUpCircle size={12} /> {t('support.escalated')} · {timeAgo(selected.escalatedAt, locale)}
              </div>
            )}
            {canEscalate && selected.assignedTo === currentAdminId && (
              <button
                onClick={onReportClick}
                className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
                title={t('support.reportAbuse')}
              >
                <Flag size={12} />
              </button>
            )}
          </div>
        )}

        {canReply && (
          isClosedTicket ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-xs text-slate-600">
              <X size={11} className="shrink-0" />
              {t('support.ticketClosed')}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  value={reply}
                  onChange={(e) => { onReplyChange(e.target.value); }}
                  rows={3}
                  maxLength={5000}
                  placeholder={t('support.yourReply')}
                  className="w-full px-3 py-2.5 pb-9 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-emerald-500/40 resize-none placeholder-slate-700 leading-relaxed"
                />
                <div className="absolute bottom-2 start-2 end-2 flex items-center justify-between">
                  <div ref={qrDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={onQRDropdownToggle}
                      className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-md bg-violet-500/15 border border-violet-500/20 text-violet-400 hover:bg-violet-500/25 transition-all"
                    >
                      <Zap size={9} /> {t('support.quickReplies')}
                    </button>
                    {showQRDropdown && (
                      <div className="absolute bottom-7 start-0 w-64 bg-[#1a1a2e] border border-white/[0.1] rounded-xl shadow-2xl z-50 overflow-hidden">
                        {quickReplies.length === 0 ? (
                          <p className="px-3 py-4 text-[11px] text-slate-500 text-center">{t('support.noQuickRepliesHint')}</p>
                        ) : (
                          quickReplies.map((qr) => (
                            <button
                              key={qr.id}
                              type="button"
                              onClick={() => onQRSelect(qr.content)}
                              className="w-full text-start px-3 py-2 hover:bg-white/[0.05] transition-colors border-b border-white/[0.05] last:border-0"
                            >
                              <p className="text-[11px] font-medium text-white">{qr.title}</p>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">{qr.content}</p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {reply.length > 4000 && (
                    <span className={`text-[10px] tabular-nums ${reply.length > 4800 ? 'text-red-400' : 'text-slate-500'}`}>
                      {5000 - reply.length}
                    </span>
                  )}
                </div>
              </div>
              {replyError && (
                <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">{replyError}</p>
              )}
              <div className="flex items-center gap-2">
                <select
                  value={newStatus}
                  onChange={(e) => onStatusChange(e.target.value)}
                  className="flex-1 px-2 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none"
                >
                  <option value="IN_PROGRESS">{t('support.inProgress')}</option>
                  <option value="RESOLVED">{t('support.resolved')}</option>
                  <option value="CLOSED">{t('support.closed')}</option>
                </select>
                <button
                  onClick={onSendReply}
                  disabled={saving || !reply.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all whitespace-nowrap"
                >
                  <Send size={11} /> {saving ? t('common.sending') : t('support.sendReply')}
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
