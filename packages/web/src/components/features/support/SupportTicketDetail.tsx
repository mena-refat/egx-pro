import React, { useState } from 'react';
import {
  LifeBuoy, ArrowLeft, MessageSquare, Clock, CheckCircle2, Ban, Star,
} from 'lucide-react';
import api from '../../../lib/api';
import { SupportTicket, StatusBadge, fullDate } from './support.types';

/* ─── Rating Widget ────────────────────────────────────────────────── */

function RatingWidget({
  ticket,
  isAr,
  onRated,
}: {
  ticket: SupportTicket;
  isAr: boolean;
  onRated: (rating: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
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

/* ─── Ticket Detail ────────────────────────────────────────────────── */

interface SupportTicketDetailProps {
  ticket: SupportTicket;
  isAr: boolean;
  onBack: () => void;
  onRated: (rating: number) => void;
  onCancelled: () => void;
}

export function SupportTicketDetail({
  ticket,
  isAr,
  onBack,
  onRated,
  onCancelled,
}: SupportTicketDetailProps) {
  const [cancelling,     setCancelling]     = useState(false);
  const [confirmCancel,  setConfirmCancel]  = useState(false);

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
