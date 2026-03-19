import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LifeBuoy, Plus, Clock, CheckCircle2, XCircle,
  Send, AlertCircle, ArrowLeft, Inbox, MessageSquare,
  RefreshCw, Star, Ban,
} from 'lucide-react';
import api from '../lib/api';

type TicketStatus   = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
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
  rating?: number | null;
  ratedAt?: string | null;
  createdAt: string;
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const STATUS_CFG: Record<TicketStatus, { label_en: string; label_ar: string; color: string; icon: React.ElementType }> = {
  OPEN:        { label_en: 'Open',        label_ar: 'مفتوحة',        color: 'text-blue-500   bg-blue-500/10',   icon: Clock        },
  IN_PROGRESS: { label_en: 'In Progress', label_ar: 'قيد المعالجة', color: 'text-yellow-500 bg-yellow-500/10', icon: AlertCircle  },
  RESOLVED:    { label_en: 'Resolved',    label_ar: 'محلولة',        color: 'text-green-500  bg-green-500/10',  icon: CheckCircle2 },
  CLOSED:      { label_en: 'Closed',      label_ar: 'مغلقة',         color: 'text-[var(--text-muted)] bg-[var(--bg-card-hover)]', icon: XCircle     },
  CANCELLED:   { label_en: 'Cancelled',   label_ar: 'ملغية',         color: 'text-red-400    bg-red-400/10',    icon: Ban          },
};

function relativeTime(dateStr: string, isAr: boolean): string {
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

function fullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ─── sub-components ──────────────────────────────────────────────────────── */

function StatusBadge({ status, isAr }: { status: TicketStatus; isAr: boolean }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {isAr ? cfg.label_ar : cfg.label_en}
    </span>
  );
}

/* ─── Rating Widget ───────────────────────────────────────────────────────── */

function RatingWidget({
  ticket,
  isAr,
  onRated,
}: {
  ticket: SupportTicket;
  isAr: boolean;
  onRated: (rating: number) => void;
}) {
  const [hovered, setHovered]   = useState(0);
  const [loading, setLoading]   = useState(false);
  const [done,    setDone]      = useState(false);
  const current = ticket.rating ?? 0;

  const labels_ar = ['', 'سيء', 'مقبول', 'جيد', 'جيد جداً', 'ممتاز'];
  const labels_en = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  if (ticket.rating) {
    return (
      <div className="mt-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {isAr ? 'شكرًا على تقييمك!' : 'Thanks for your feedback!'}
          </p>
          <div className="flex items-center gap-0.5 mt-1">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`w-4 h-4 ${s <= current ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--border-strong)]'}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleRate = async (rating: number) => {
    if (loading || done) return;
    setLoading(true);
    try {
      await api.patch(`/support/${ticket.id}/rate`, { rating });
      setDone(true);
      onRated(rating);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
      <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
        {isAr ? 'كيف كانت تجربتك مع فريق الدعم؟' : 'How was your support experience?'}
      </p>
      <div className="flex items-center gap-1.5">
        {[1,2,3,4,5].map(s => (
          <button
            key={s}
            disabled={loading}
            onClick={() => handleRate(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            className="p-1 rounded-lg transition-transform hover:scale-110 disabled:opacity-50"
          >
            <Star className={`w-7 h-7 transition-colors ${s <= (hovered || current) ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--border-strong)]'}`} />
          </button>
        ))}
        {hovered > 0 && (
          <span className="text-xs text-[var(--text-muted)] ms-2">
            {isAr ? labels_ar[hovered] : labels_en[hovered]}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Ticket Detail View ──────────────────────────────────────────────────── */

function TicketDetail({
  ticket,
  isAr,
  onBack,
  onRated,
  onCancelled,
}: {
  ticket: SupportTicket;
  isAr: boolean;
  onBack: () => void;
  onRated: (rating: number) => void;
  onCancelled: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.patch(`/support/${ticket.id}/cancel`);
      onCancelled();
    } catch { /* silent */ } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  const canCancel = ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS';

  return (
    <div className="flex flex-col gap-4">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-[var(--text-primary)] truncate">{ticket.subject}</h2>
          <p className="text-xs text-[var(--text-muted)]">{fullDate(ticket.createdAt)}</p>
        </div>
        <StatusBadge status={ticket.status} isAr={isAr} />
      </div>

      {/* Conversation thread */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">

        {/* User message bubble */}
        <div className="p-5 border-b border-[var(--border)]">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--brand)]/15 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-[var(--brand)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {isAr ? 'أنت' : 'You'}
                </span>
                <span className="text-xs text-[var(--text-muted)]">{fullDate(ticket.createdAt)}</span>
              </div>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                {ticket.message}
              </p>
            </div>
          </div>
        </div>

        {/* Support reply or waiting */}
        {ticket.reply ? (
          <div className="p-5 bg-[var(--brand)]/3">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--brand)]/20 flex items-center justify-center">
                <LifeBuoy className="w-4 h-4 text-[var(--brand)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-[var(--brand)]">
                    {isAr ? 'فريق الدعم' : 'Support Team'}
                  </span>
                  {ticket.repliedAt && (
                    <span className="text-xs text-[var(--text-muted)]">{fullDate(ticket.repliedAt)}</span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                  {ticket.reply}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 flex items-center gap-3 text-[var(--text-muted)]">
            <Clock className="w-4 h-4 shrink-0 animate-pulse" />
            <span className="text-sm">
              {isAr ? 'في انتظار رد فريق الدعم...' : 'Waiting for a reply from our support team...'}
            </span>
          </div>
        )}
      </div>

      {/* Rating — show only when resolved/closed */}
      {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
        <RatingWidget ticket={ticket} isAr={isAr} onRated={onRated} />
      )}

      {/* Cancel ticket — only when open/in-progress */}
      {canCancel && (
        <div className="border border-[var(--border)] rounded-2xl p-4">
          {!confirmCancel ? (
            <button
              onClick={() => setConfirmCancel(true)}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-500 transition-colors"
            >
              <Ban className="w-4 h-4" />
              {isAr ? 'إلغاء الطلب' : 'Cancel request'}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-secondary)]">
                {isAr ? 'هل أنت متأكد أنك تريد إلغاء هذا الطلب؟' : 'Are you sure you want to cancel this request?'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <Ban className="w-3.5 h-3.5" />
                  {cancelling
                    ? (isAr ? 'جاري الإلغاء...' : 'Cancelling...')
                    : (isAr ? 'نعم، ألغِ الطلب' : 'Yes, cancel')}
                </button>
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="px-4 py-2 rounded-xl text-sm text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  {isAr ? 'لا، ارجع' : 'No, go back'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Ticket Card ─────────────────────────────────────────────────────────── */

function TicketCard({
  ticket,
  isAr,
  onClick,
}: {
  ticket: SupportTicket;
  isAr: boolean;
  onClick: () => void;
}) {
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
}

/* ─── New Ticket Form ─────────────────────────────────────────────────────── */

function NewTicketForm({
  isAr,
  onCancel,
  onSuccess,
}: {
  isAr: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation('common');
  const [subject,    setSubject]    = useState('');
  const [message,    setMessage]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/support', { subject: subject.trim(), message: message.trim() });
      onSuccess();
    } catch {
      setError(t('support.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
          <LifeBuoy className="w-4 h-4 text-[var(--brand)]" />
        </div>
        <h2 className="font-semibold text-[var(--text-primary)]">{t('support.newTicket')}</h2>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)]">{t('support.subjectLabel')}</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={t('support.subjectPlaceholder')}
            maxLength={120}
            required
            autoFocus
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 transition"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)]">{t('support.messageLabel')}</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('support.messagePlaceholder')}
            rows={6}
            maxLength={2000}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 resize-none transition"
          />
          <p className="text-xs text-[var(--text-muted)] text-end">{message.length} / 2000</p>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-xl">{error}</p>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting || !subject.trim() || !message.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--brand)] text-[var(--text-inverse)] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال' : 'Send')}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ─── Stats Bar ───────────────────────────────────────────────────────────── */

function StatsBar({ tickets, isAr }: { tickets: SupportTicket[]; isAr: boolean }) {
  const open       = tickets.filter(t => t.status === 'OPEN').length;
  const inProgress = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolved   = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const unread     = tickets.filter(t => t.reply && !t.replyRead).length;
  const active     = tickets.filter(t => t.status !== 'CANCELLED').length;

  const items = [
    { label: isAr ? 'الكل' : 'Total',       value: active,         color: 'text-[var(--text-primary)]' },
    { label: isAr ? 'مفتوحة' : 'Open',      value: open,           color: 'text-blue-500'              },
    { label: isAr ? 'معالجة' : 'Active',    value: inProgress,     color: 'text-yellow-500'            },
    { label: isAr ? 'محلولة' : 'Resolved',  value: resolved,       color: 'text-green-500'             },
    { label: isAr ? 'ردود جديدة' : 'New replies', value: unread,   color: 'text-red-500'               },
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

/* ─── Main Page ───────────────────────────────────────────────────────────── */

type View = 'list' | 'new' | 'detail';

export default function SupportPage() {
  const { t, i18n } = useTranslation('common');
  const isAr = i18n.language.startsWith('ar');

  const [tickets,  setTickets]  = useState<SupportTicket[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState<View>('list');
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [success,  setSuccess]  = useState(false);

  const fetchTickets = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res  = await api.get('/support/my');
      // The Axios interceptor unwraps { ok, data } → res.data = data (the array)
      const raw  = res.data;
      // Backend returns { tickets, total, page, pages } — unwrap accordingly
      const list: SupportTicket[] = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { tickets?: SupportTicket[] })?.tickets)
          ? (raw as { tickets: SupportTicket[] }).tickets
          : Array.isArray((raw as { items?: SupportTicket[] })?.items)
            ? (raw as { items: SupportTicket[] }).items
            : [];
      setTickets(list);
      // keep selected in sync if viewing detail
      setSelected(prev => prev ? (list.find(t => t.id === prev.id) ?? prev) : null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleOpenDetail = useCallback(async (ticket: SupportTicket) => {
    setSelected(ticket);
    setView('detail');
    // mark reply as read if needed
    if (ticket.reply && !ticket.replyRead) {
      try {
        await api.patch(`/support/${ticket.id}/read-reply`);
        setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, replyRead: true } : t));
        window.dispatchEvent(new CustomEvent('support:reply-read'));
      } catch { /* silent */ }
    }
  }, []);

  const handleNewSuccess = useCallback(async () => {
    setView('list');
    setSuccess(true);
    await fetchTickets(true);
    setTimeout(() => setSuccess(false), 5000);
  }, [fetchTickets]);

  const unreadCount = tickets.filter(t => t.reply && !t.replyRead).length;

  /* ── List view ── */
  if (view === 'list') {
    return (
      <div className="space-y-5 max-w-2xl mx-auto">

        {/* Page header */}
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTickets(true)}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
              title={isAr ? 'تحديث' : 'Refresh'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('new')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand)] text-[var(--text-inverse)] font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              {t('support.newTicket')}
            </button>
          </div>
        </div>

        {/* Success toast */}
        {success && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{t('support.submitSuccess')}</span>
          </div>
        )}

        {/* Stats */}
        {!loading && tickets.length > 0 && (
          <StatsBar tickets={tickets} isAr={isAr} />
        )}

        {/* Tickets */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-[var(--bg-card)] animate-pulse border border-[var(--border)]" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card-hover)] flex items-center justify-center">
              <Inbox className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">{t('support.noTickets')}</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">{t('support.noTicketsHint')}</p>
            </div>
            <button
              onClick={() => setView('new')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand)] text-[var(--text-inverse)] font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              {t('support.newTicket')}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tickets.map(ticket => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                isAr={isAr}
                onClick={() => handleOpenDetail(ticket)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── New ticket view ── */
  if (view === 'new') {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('list')}
            className="p-2 rounded-xl hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('support.newTicket')}</h1>
        </div>
        <NewTicketForm
          isAr={isAr}
          onCancel={() => setView('list')}
          onSuccess={handleNewSuccess}
        />
      </div>
    );
  }

  /* ── Detail view ── */
  if (view === 'detail' && selected) {
    return (
      <div className="max-w-2xl mx-auto">
        <TicketDetail
          ticket={selected}
          isAr={isAr}
          onBack={() => { setView('list'); setSelected(null); }}
          onRated={(rating) => {
            setSelected(prev => prev ? { ...prev, rating } : prev);
            setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, rating } : t));
          }}
          onCancelled={() => {
            setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, status: 'CANCELLED' as TicketStatus } : t));
            setSelected(prev => prev ? { ...prev, status: 'CANCELLED' as TicketStatus } : prev);
          }}
        />
      </div>
    );
  }

  return null;
}
