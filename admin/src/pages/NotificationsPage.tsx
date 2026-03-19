import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Badge } from '../components/Badge';
import { Send, Clock, CalendarClock, Trash2, XCircle, RefreshCw } from 'lucide-react';

const PLAN_OPTIONS = [
  { id: 'free',  label: 'Free' },
  { id: 'pro',   label: 'Pro (Monthly)' },
  { id: 'ultra', label: 'Ultra (Monthly)' },
];

type RepeatKey = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
type StatusKey = 'PENDING' | 'SENT' | 'CANCELLED';

interface ScheduledItem {
  id: number;
  title: string;
  body: string;
  plans: string[];
  scheduledAt: string;
  repeat: RepeatKey;
  nextSendAt: string;
  lastSentAt: string | null;
  sentCount: number;
  status: StatusKey;
  createdBy: { id: number; fullName: string };
}

type Tab = 'send' | 'schedule' | 'scheduled';

export default function NotificationsPage() {
  const { t } = useTranslation();

  // ─── Active tab ────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('send');

  // ─── Send Now form ─────────────────────────────────────────────────────────
  const [title,   setTitle]   = useState('');
  const [body,    setBody]    = useState('');
  const [plans,   setPlans]   = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  // ─── Schedule form ─────────────────────────────────────────────────────────
  const [sTitle,       setSTitle]       = useState('');
  const [sBody,        setSBody]        = useState('');
  const [sPlans,       setSPlans]       = useState<string[]>([]);
  const [sScheduledAt, setSScheduledAt] = useState('');
  const [sRepeat,      setSRepeat]      = useState<RepeatKey>('NONE');
  const [scheduling,   setScheduling]   = useState(false);
  const [schedStatus,  setSchedStatus]  = useState<string | null>(null);

  // ─── Scheduled list ────────────────────────────────────────────────────────
  const [rows,         setRows]        = useState<ScheduledItem[]>([]);
  const [listLoading,  setListLoading] = useState(false);
  const [listFilter,   setListFilter]  = useState<'ALL' | 'PENDING'>('PENDING');
  const [confirmId,    setConfirmId]   = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'delete'>('cancel');
  const [actionLoading, setActionLoading] = useState(false);

  const togglePlan = (set: string[], id: string, setter: (v: string[]) => void) =>
    setter(set.includes(id) ? set.filter((p) => p !== id) : [...set, id]);

  // ─── Load scheduled list ───────────────────────────────────────────────────
  const loadScheduled = useCallback(async (filter: 'ALL' | 'PENDING') => {
    setListLoading(true);
    try {
      const params = filter === 'PENDING' ? '?status=PENDING' : '';
      const r = await adminApi.get(`/notifications/scheduled${params}`);
      setRows(r.data.data?.items ?? []);
    } catch {
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'scheduled') void loadScheduled(listFilter);
  }, [tab, listFilter, loadScheduled]);

  // ─── Send Now ──────────────────────────────────────────────────────────────
  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    setSendStatus(null);
    setSending(true);
    try {
      await adminApi.post('/notifications/broadcast', {
        title,
        body,
        plans: plans.length ? plans : undefined,
      });
      setSendStatus('sent');
      setTitle(''); setBody(''); setPlans([]);
    } catch (err: any) {
      setSendStatus(err?.response?.data?.error ?? 'ERROR');
    } finally {
      setSending(false);
    }
  };

  // ─── Schedule ──────────────────────────────────────────────────────────────
  const handleSchedule = async (e: FormEvent) => {
    e.preventDefault();
    setSchedStatus(null);
    setScheduling(true);
    try {
      await adminApi.post('/notifications/schedule', {
        title: sTitle,
        body: sBody,
        plans: sPlans.length ? sPlans : undefined,
        scheduledAt: sScheduledAt,
        repeat: sRepeat,
      });
      setSchedStatus('ok');
      setSTitle(''); setSBody(''); setSPlans([]); setSScheduledAt(''); setSRepeat('NONE');
    } catch (err: any) {
      setSchedStatus(err?.response?.data?.error ?? 'ERROR');
    } finally {
      setScheduling(false);
    }
  };

  // ─── Cancel / Delete ───────────────────────────────────────────────────────
  const handleAction = async () => {
    if (confirmId == null) return;
    setActionLoading(true);
    try {
      if (confirmAction === 'cancel') {
        await adminApi.patch(`/notifications/scheduled/${confirmId}/cancel`);
      } else {
        await adminApi.delete(`/notifications/scheduled/${confirmId}`);
      }
      setConfirmId(null);
      void loadScheduled(listFilter);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const statusBadge = (s: StatusKey) => {
    if (s === 'PENDING')   return <Badge color="yellow">{t('notifications.statusPending')}</Badge>;
    if (s === 'SENT')      return <Badge color="green">{t('notifications.statusSent')}</Badge>;
    return <Badge color="gray">{t('notifications.statusCancelled')}</Badge>;
  };

  const repeatLabel = (r: RepeatKey) => {
    if (r === 'DAILY')   return t('notifications.repeatDaily');
    if (r === 'WEEKLY')  return t('notifications.repeatWeekly');
    if (r === 'MONTHLY') return t('notifications.repeatMonthly');
    return t('notifications.repeatNone');
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'send',      label: t('notifications.tabSendNow'),  icon: <Send size={12} /> },
    { key: 'schedule',  label: t('notifications.tabSchedule'), icon: <CalendarClock size={12} /> },
    { key: 'scheduled', label: t('notifications.tabScheduled'), icon: <Clock size={12} /> },
  ];

  // ─── Shared form field class ────────────────────────────────────────────────
  const fieldCls = 'w-full rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20';

  const PlanCheckboxes = ({
    selected, onToggle,
  }: { selected: string[]; onToggle: (id: string) => void }) => (
    <div className="space-y-1.5 text-sm">
      <label className="block text-slate-300">{t('notifications.planFilter')}</label>
      <div className="flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2">
        {PLAN_OPTIONS.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(p.id)}
              onChange={() => onToggle(p.id)}
              className="w-3 h-3 rounded border border-white/30 bg-transparent"
            />
            <span>{p.label}</span>
          </label>
        ))}
        <p className="text-[11px] text-slate-500 mt-1">{t('notifications.leaveUnchecked')}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{t('notifications.title')}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-white/[0.04] p-1 w-fit border border-white/[0.06]">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === tb.key
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>

      {/* ── Send Now ─────────────────────────────────────────────────────────── */}
      {tab === 'send' && (
        <form onSubmit={handleSend} className="space-y-4 max-w-lg rounded-xl border border-white/[0.07] bg-[#111118] p-5">
          {sendStatus && (
            <div className={`text-sm ${sendStatus === 'sent' ? 'text-emerald-300' : 'text-red-400'}`}>
              {sendStatus === 'sent' ? t('notifications.sent') : sendStatus}
            </div>
          )}
          <div className="space-y-1.5 text-sm">
            <label className="block text-slate-300">{t('notifications.titleLabel')}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldCls} />
          </div>
          <div className="space-y-1.5 text-sm">
            <label className="block text-slate-300">{t('notifications.body')}</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} className={`${fieldCls} min-h-[120px]`} />
          </div>
          <PlanCheckboxes selected={plans} onToggle={(id) => togglePlan(plans, id, setPlans)} />
          <button
            type="submit"
            disabled={sending || !title.trim() || !body.trim()}
            className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold px-4 py-2 disabled:opacity-60 transition-all"
          >
            {sending ? t('common.sending') : t('notifications.send')}
          </button>
        </form>
      )}

      {/* ── Schedule ─────────────────────────────────────────────────────────── */}
      {tab === 'schedule' && (
        <form onSubmit={handleSchedule} className="space-y-4 max-w-lg rounded-xl border border-white/[0.07] bg-[#111118] p-5">
          {schedStatus && (
            <div className={`text-sm ${schedStatus === 'ok' ? 'text-emerald-300' : 'text-red-400'}`}>
              {schedStatus === 'ok' ? t('notifications.scheduledSuccess') : schedStatus}
            </div>
          )}
          <div className="space-y-1.5 text-sm">
            <label className="block text-slate-300">{t('notifications.titleLabel')}</label>
            <input value={sTitle} onChange={(e) => setSTitle(e.target.value)} className={fieldCls} />
          </div>
          <div className="space-y-1.5 text-sm">
            <label className="block text-slate-300">{t('notifications.body')}</label>
            <textarea value={sBody} onChange={(e) => setSBody(e.target.value)} className={`${fieldCls} min-h-[120px]`} />
          </div>
          <PlanCheckboxes selected={sPlans} onToggle={(id) => togglePlan(sPlans, id, setSPlans)} />

          {/* Date & Time */}
          <div className="space-y-1.5 text-sm">
            <label className="block text-slate-300">{t('notifications.scheduledAt')}</label>
            <input
              type="datetime-local"
              value={sScheduledAt}
              onChange={(e) => setSScheduledAt(e.target.value)}
              className={fieldCls}
            />
          </div>

          {/* Repeat */}
          <div className="space-y-1.5 text-sm">
            <label className="block text-slate-300">{t('notifications.repeat')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'] as RepeatKey[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSRepeat(r)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    sRepeat === r
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/[0.08] bg-[#0d0d14] text-slate-400 hover:text-white'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full border-2 ${sRepeat === r ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'}`} />
                  {r === 'NONE'    && t('notifications.repeatNone')}
                  {r === 'DAILY'   && t('notifications.repeatDaily')}
                  {r === 'WEEKLY'  && t('notifications.repeatWeekly')}
                  {r === 'MONTHLY' && t('notifications.repeatMonthly')}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={scheduling || !sTitle.trim() || !sBody.trim() || !sScheduledAt}
            className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold px-4 py-2 disabled:opacity-60 transition-all"
          >
            {scheduling ? t('common.saving') : t('notifications.scheduleBtn')}
          </button>
        </form>
      )}

      {/* ── Scheduled list ───────────────────────────────────────────────────── */}
      {tab === 'scheduled' && (
        <div className="space-y-4">
          {/* Filter + Refresh */}
          <div className="flex items-center gap-2">
            {(['PENDING', 'ALL'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setListFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  listFilter === f
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'border-white/[0.07] text-slate-400 hover:text-white'
                }`}
              >
                {f === 'PENDING' ? t('notifications.filterPending') : t('notifications.filterAll')}
              </button>
            ))}
            <button
              onClick={() => void loadScheduled(listFilter)}
              className="ms-auto p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors"
            >
              <RefreshCw size={13} className={listLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-white/[0.07] bg-[#111118] overflow-hidden">
            {listLoading ? (
              <div className="py-12 text-center text-sm text-slate-500">{t('common.loading')}</div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">{t('notifications.noScheduled')}</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs text-slate-500 text-left">
                    <th className="px-4 py-3 font-medium">{t('notifications.titleLabel')}</th>
                    <th className="px-4 py-3 font-medium">{t('notifications.colPlans')}</th>
                    <th className="px-4 py-3 font-medium">{t('notifications.colScheduledAt')}</th>
                    <th className="px-4 py-3 font-medium">{t('notifications.colRepeat')}</th>
                    <th className="px-4 py-3 font-medium">{t('notifications.colSentCount')}</th>
                    <th className="px-4 py-3 font-medium">{t('notifications.colStatus')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium truncate max-w-[180px]">{row.title}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[180px] mt-0.5">{row.body}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {row.plans.length > 0 ? row.plans.join(', ') : t('notifications.allPlans')}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300 tabular-nums whitespace-nowrap">
                        {new Date(row.scheduledAt).toLocaleString()}
                        {row.repeat !== 'NONE' && row.status === 'PENDING' && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {t('notifications.colScheduledAt')}: {new Date(row.nextSendAt).toLocaleString()}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{repeatLabel(row.repeat)}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 tabular-nums text-center">{row.sentCount}</td>
                      <td className="px-4 py-3">{statusBadge(row.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          {row.status === 'PENDING' && (
                            <button
                              title={t('notifications.cancelSchedule')}
                              onClick={() => { setConfirmId(row.id); setConfirmAction('cancel'); }}
                              className="p-1.5 rounded text-slate-500 hover:text-amber-400 transition-colors"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                          <button
                            title={t('notifications.deleteSchedule')}
                            onClick={() => { setConfirmId(row.id); setConfirmAction('delete'); }}
                            className="p-1.5 rounded text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmId != null}
        title={confirmAction === 'cancel' ? t('notifications.cancelSchedule') : t('notifications.deleteSchedule')}
        message={confirmAction === 'cancel' ? t('notifications.confirmCancel') : t('notifications.confirmDelete')}
        confirmLabel={confirmAction === 'cancel' ? t('notifications.cancelSchedule') : t('notifications.deleteSchedule')}
        danger={confirmAction === 'delete'}
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
