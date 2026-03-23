import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LifeBuoy, Plus, ArrowLeft, Inbox, RefreshCw, CheckCircle2, Lock, Zap, Clock } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { SupportTicket, TicketStatus } from '../components/features/support/support.types';
import { SupportNewTicketForm } from '../components/features/support/SupportNewTicketForm';
import { SupportTicketDetail } from '../components/features/support/SupportTicketDetail';
import { TicketCard, StatsBar } from '../components/features/support/SupportTicketList';

type View = 'list' | 'new' | 'detail';

export default function SupportPage() {
  const { t, i18n } = useTranslation('common');
  const isAr = i18n.language.startsWith('ar');
  const user = useAuthStore(s => s.user);

  const plan = user?.plan ?? 'free';
  const hasReferralPro = !!(user?.referralProExpiresAt && new Date(user.referralProExpiresAt) > new Date());
  const isPlanEligible = plan !== 'free' || hasReferralPro;

  const [allowedPlans, setAllowedPlans] = useState<string[] | null>(null);
  useEffect(() => {
    api.get('/support/settings')
      .then((r) => {
        const plans = (r.data as { data?: { allowedPlans?: string[] } })?.data?.allowedPlans
          ?? (r.data as { allowedPlans?: string[] })?.allowedPlans;
        if (Array.isArray(plans)) setAllowedPlans(plans);
      })
      .catch(() => null);
  }, []);

  const isAdminLocked = allowedPlans !== null
    && !allowedPlans.includes(plan)
    && !(hasReferralPro && allowedPlans.includes('pro'));

  const canUseSupport = isPlanEligible && !isAdminLocked;

  const [tickets,  setTickets]  = useState<SupportTicket[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState<View>('list');
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [success,  setSuccess]  = useState(false);

  const fetchTickets = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res  = await api.get('/support/my');
      const raw  = res.data;
      const list: SupportTicket[] = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { tickets?: SupportTicket[] })?.tickets)
          ? (raw as { tickets: SupportTicket[] }).tickets
          : Array.isArray((raw as { items?: SupportTicket[] })?.items)
            ? (raw as { items: SupportTicket[] }).items
            : [];
      setTickets(list);
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
            {canUseSupport ? (
              <button
                onClick={() => setView('new')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand)] text-[var(--text-inverse)] font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                {t('support.newTicket')}
              </button>
            ) : isPlanEligible && isAdminLocked ? (
              <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] font-semibold text-sm cursor-default select-none">
                <Clock className="w-4 h-4" />
                {isAr ? 'مغلق مؤقتاً' : 'Temporarily closed'}
              </span>
            ) : (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-subscription'))}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 font-semibold text-sm hover:bg-amber-500/15 transition-colors"
              >
                <Lock className="w-4 h-4" />
                {t('support.upgradeToContact')}
              </button>
            )}
          </div>
        </div>

        {/* Admin-locked banner (paid user, support disabled by admin) */}
        {isPlanEligible && isAdminLocked && (
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="p-2 rounded-xl bg-[var(--bg-card-hover)] shrink-0">
              <Clock className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--text-primary)] text-sm">
                {isAr ? 'الدعم الفني غير متاح حالياً' : 'Support temporarily unavailable'}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                {isAr ? 'تم إيقاف الدعم الفني مؤقتاً، سيعود قريباً.' : 'Support has been temporarily paused and will return soon.'}
              </p>
            </div>
          </div>
        )}

        {/* Free plan banner */}
        {!isPlanEligible && (
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-br from-amber-500/8 to-orange-500/8 border border-amber-500/20">
            <div className="p-2 rounded-xl bg-amber-500/15 shrink-0">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--text-primary)] text-sm">{t('support.freeLockedTitle')}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{t('support.freeLockedDesc')}</p>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-subscription'))}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors whitespace-nowrap"
            >
              {t('support.upgradeNow')}
            </button>
          </div>
        )}

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
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {canUseSupport
                  ? t('support.noTicketsHint')
                  : isAdminLocked
                  ? (isAr ? 'الدعم الفني متوقف مؤقتاً' : 'Support is temporarily paused')
                  : t('support.freeLockedDesc')}
              </p>
            </div>
            {canUseSupport ? (
              <button
                onClick={() => setView('new')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand)] text-[var(--text-inverse)] font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                {t('support.newTicket')}
              </button>
            ) : !isPlanEligible ? (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-subscription'))}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors"
              >
                <Zap className="w-4 h-4" />
                {t('support.upgradeNow')}
              </button>
            ) : null}
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
  if (view === 'new' && !canUseSupport) { setView('list'); return null; }
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
        <SupportNewTicketForm
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
        <SupportTicketDetail
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
