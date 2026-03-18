import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LifeBuoy, Plus, Clock, CheckCircle2, XCircle,
  MessageSquare, ChevronDown, ChevronUp, Send, AlertCircle,
} from 'lucide-react';
import api from '../lib/api';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  reply?: string | null;
  repliedAt?: string | null;
  replyRead: boolean;
  createdAt: string;
}

const STATUS_CONFIG: Record<TicketStatus, { color: string; icon: React.ElementType }> = {
  OPEN:        { color: 'text-blue-500 bg-blue-500/10',                        icon: Clock         },
  IN_PROGRESS: { color: 'text-yellow-500 bg-yellow-500/10',                    icon: AlertCircle   },
  RESOLVED:    { color: 'text-green-500 bg-green-500/10',                      icon: CheckCircle2  },
  CLOSED:      { color: 'text-[var(--text-muted)] bg-[var(--bg-card-hover)]',  icon: XCircle       },
};

function relativeTime(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  const isAr  = lang.startsWith('ar');

  if (mins < 1)   return isAr ? 'الآن'            : 'just now';
  if (mins < 60)  return isAr ? `منذ ${mins} د`   : `${mins}m ago`;
  if (hours < 24) return isAr ? `منذ ${hours} س`  : `${hours}h ago`;
  if (days < 7)   return isAr ? `منذ ${days} أيام`: `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function SupportPage() {
  const { t, i18n } = useTranslation('common');
  const lang = i18n.language;

  const [tickets, setTickets]   = useState<SupportTicket[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subject, setSubject]   = useState('');
  const [message, setMessage]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const res  = await api.get('/support/my');
      const body = res.data as { items?: SupportTicket[]; data?: SupportTicket[] };
      const list = body.items ?? (Array.isArray(body.data) ? body.data : []);
      setTickets(list);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // عند فتح تذكرة فيها رد غير مقروء → نعلّمها كمقروءة
  const handleExpand = useCallback(async (ticket: SupportTicket) => {
    const nowExpanded = expandedId === ticket.id;
    setExpandedId(nowExpanded ? null : ticket.id);

    if (!nowExpanded && ticket.reply && !ticket.replyRead) {
      try {
        await api.patch(`/support/${ticket.id}/read-reply`);
        setTickets(prev =>
          prev.map(t => t.id === ticket.id ? { ...t, replyRead: true } : t)
        );
      } catch {
        // silent — not critical
      }
    }
  }, [expandedId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/support', { subject: subject.trim(), message: message.trim() });
      setSuccess(true);
      setSubject('');
      setMessage('');
      setShowForm(false);
      await fetchTickets();
      setTimeout(() => setSuccess(false), 4000);
    } catch {
      setError(t('support.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (status: TicketStatus) => t(`support.status.${status.toLowerCase()}`);

  const unreadCount = tickets.filter(t => t.reply && !t.replyRead).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative p-2 rounded-xl bg-[var(--brand)]/10">
            <LifeBuoy className="w-6 h-6 text-[var(--brand)]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('support.title')}</h1>
            <p className="text-sm text-[var(--text-muted)]">{t('support.subtitle')}</p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand)] text-[var(--text-inverse)] font-medium text-sm hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus className="w-4 h-4" />
            {t('support.newTicket')}
          </button>
        )}
      </div>

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{t('support.submitSuccess')}</span>
        </div>
      )}

      {/* New ticket form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)]">{t('support.newTicket')}</h2>

          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--text-secondary)]">{t('support.subjectLabel')}</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={t('support.subjectPlaceholder')}
              maxLength={120}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--text-secondary)]">{t('support.messageLabel')}</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={t('support.messagePlaceholder')}
              rows={5}
              maxLength={2000}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 resize-none"
            />
            <p className="text-xs text-[var(--text-muted)] text-end">{message.length}/2000</p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null); }}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || !subject.trim() || !message.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand)] text-[var(--text-inverse)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? t('support.sending') : t('support.send')}
            </button>
          </div>
        </form>
      )}

      {/* Tickets list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-[var(--bg-card)] animate-pulse" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <MessageSquare className="w-12 h-12 text-[var(--text-muted)]" />
          <p className="text-[var(--text-secondary)] font-medium">{t('support.noTickets')}</p>
          <p className="text-sm text-[var(--text-muted)]">{t('support.noTicketsHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => {
            const cfg        = STATUS_CONFIG[ticket.status];
            const StatusIcon = cfg.icon;
            const isExpanded = expandedId === ticket.id;
            const hasUnreadReply = ticket.reply && !ticket.replyRead;

            return (
              <div
                key={ticket.id}
                className={`bg-[var(--bg-card)] border rounded-2xl overflow-hidden transition-colors ${
                  hasUnreadReply ? 'border-red-500/40' : 'border-[var(--border)]'
                }`}
              >
                <button
                  onClick={() => handleExpand(ticket)}
                  className="w-full flex items-center gap-3 p-4 text-start hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  {/* Status badge */}
                  <div className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusLabel(ticket.status)}
                  </div>

                  {/* Subject + time sent */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-primary)] truncate text-sm">{ticket.subject}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {t('support.sentAt')} {relativeTime(ticket.createdAt, lang)}
                    </p>
                  </div>

                  {/* Unread reply dot */}
                  {hasUnreadReply && (
                    <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-red-500">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      {t('support.newReply')}
                    </span>
                  )}

                  {isExpanded
                    ? <ChevronUp  className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  }
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-[var(--border)]">
                    {/* Original message */}
                    <div className="pt-3">
                      <p className="text-xs font-medium text-[var(--text-muted)] mb-1">{t('support.yourMessage')}</p>
                      <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{ticket.message}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {new Date(ticket.createdAt).toLocaleString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Admin reply */}
                    {ticket.reply ? (
                      <div className="bg-[var(--brand)]/5 border border-[var(--brand)]/20 rounded-xl p-3">
                        <p className="text-xs font-medium text-[var(--brand)] mb-1">{t('support.adminReply')}</p>
                        <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{ticket.reply}</p>
                        {ticket.repliedAt && (
                          <p className="text-xs text-[var(--text-muted)] mt-2">
                            {new Date(ticket.repliedAt).toLocaleString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2">
                        <Clock className="w-3.5 h-3.5" />
                        {t('support.waitingReply')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
