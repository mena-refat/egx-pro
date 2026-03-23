import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable } from '../components/DataTable';
import { Badge } from '../components/Badge';
import {
  Send, Clock, CalendarClock, Trash2, XCircle, PlayCircle,
  RefreshCw, Users, Repeat2, CheckCircle2,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────

const PLAN_OPTIONS = [
  { id: 'free',  label: 'Free' },
  { id: 'pro',   label: 'Pro' },
  { id: 'ultra', label: 'Ultra' },
];

type RepeatKey = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
type StatusKey = 'PENDING' | 'SENT' | 'CANCELLED';
type Tab = 'send' | 'schedule' | 'scheduled';

const REPEATS: { key: RepeatKey; icon: React.ReactNode }[] = [
  { key: 'NONE',    icon: <CheckCircle2 size={13} /> },
  { key: 'DAILY',   icon: <Repeat2 size={13} /> },
  { key: 'WEEKLY',  icon: <Repeat2 size={13} /> },
  { key: 'MONTHLY', icon: <Repeat2 size={13} /> },
];

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Sub-component (defined outside to avoid remount on render) ───────────────

const FIELD = 'w-full rounded-lg border border-white/[0.08] bg-[#0d0d14] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors';

function PlanPicker({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  const { t } = useTranslation();
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-2">{t('notifications.planFilter')}</label>
      <div className="flex gap-2 flex-wrap">
        {PLAN_OPTIONS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              selected.includes(p.id)
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-white/[0.08] bg-[#0d0d14] text-slate-400 hover:text-white hover:border-white/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${selected.includes(p.id) ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            {p.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-600 mt-1.5">{t('notifications.leaveUnchecked')}</p>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { t } = useTranslation();

  const [tab, setTab] = useState<Tab>('send');

  // Send Now
  const [title,      setTitle]      = useState('');
  const [body,       setBody]       = useState('');
  const [plans,      setPlans]      = useState<string[]>([]);
  const [sending,    setSending]    = useState(false);
  const [sendStatus, setSendStatus] = useState<'ok' | 'err' | null>(null);
  const [sendMsg,    setSendMsg]    = useState('');

  // Schedule form
  const [sTitle,       setSTitle]       = useState('');
  const [sBody,        setSBody]        = useState('');
  const [sPlans,       setSPlans]       = useState<string[]>([]);
  const [sScheduledAt, setSScheduledAt] = useState('');
  const [sRepeat,      setSRepeat]      = useState<RepeatKey>('NONE');
  const [scheduling,   setScheduling]   = useState(false);
  const [schedStatus,  setSchedStatus]  = useState<'ok' | 'err' | null>(null);
  const [schedMsg,     setSchedMsg]     = useState('');

  // Scheduled list
  const [rows,          setRows]          = useState<ScheduledItem[]>([]);
  const [listLoading,   setListLoading]   = useState(false);
  const [listFilter,    setListFilter]    = useState<'ALL' | 'PENDING'>('PENDING');
  const [confirmId,     setConfirmId]     = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'resume' | 'delete'>('cancel');
  const [actionLoading, setActionLoading] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const togglePlan = (set: string[], id: string, setter: (v: string[]) => void) =>
    setter(set.includes(id) ? set.filter((p) => p !== id) : [...set, id]);

  const repeatLabel = (r: RepeatKey) => {
    if (r === 'DAILY')   return t('notifications.repeatDaily');
    if (r === 'WEEKLY')  return t('notifications.repeatWeekly');
    if (r === 'MONTHLY') return t('notifications.repeatMonthly');
    return t('notifications.repeatNone');
  };

  // ── Load scheduled ─────────────────────────────────────────────────────────

  const loadScheduled = useCallback(async (filter: 'ALL' | 'PENDING') => {
    setListLoading(true);
    try {
      const qs = filter === 'PENDING' ? '?status=PENDING' : '';
      const r = await adminApi.get(`/notifications/scheduled${qs}`);
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

  // ── Send Now ───────────────────────────────────────────────────────────────

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    setSendStatus(null);
    setSending(true);
    try {
      const r = await adminApi.post('/notifications/broadcast', {
        title,
        body,
        plans: plans.length ? plans : undefined,
      });
      const count: number = r.data.data?.count ?? 0;
      setSendStatus('ok');
      setSendMsg(`${t('notifications.sent')} (${count} users)`);
      setTitle(''); setBody(''); setPlans([]);
    } catch (err: any) {
      setSendStatus('err');
      setSendMsg(err?.response?.data?.error ?? 'ERROR');
    } finally {
      setSending(false);
    }
  };

  // ── Schedule ───────────────────────────────────────────────────────────────

  const handleSchedule = async (e: FormEvent) => {
    e.preventDefault();
    setSchedStatus(null);
    setScheduling(true);
    try {
      await adminApi.post('/notifications/schedule', {
        title: sTitle,
        body: sBody,
        plans: sPlans.length ? sPlans : undefined,
        scheduledAt: new Date(sScheduledAt).toISOString(),
        repeat: sRepeat,
      });
      setSchedStatus('ok');
      setSchedMsg(t('notifications.scheduledSuccess'));
      setSTitle(''); setSBody(''); setSPlans([]); setSScheduledAt(''); setSRepeat('NONE');
    } catch (err: any) {
      setSchedStatus('err');
      setSchedMsg(err?.response?.data?.error ?? 'ERROR');
    } finally {
      setScheduling(false);
    }
  };

  // ── Cancel / Delete ────────────────────────────────────────────────────────

  const handleConfirmedAction = async () => {
    if (confirmId == null) return;
    setActionLoading(true);
    try {
      if (confirmAction === 'cancel') {
        await adminApi.patch(`/notifications/scheduled/${confirmId}/cancel`);
      } else if (confirmAction === 'resume') {
        await adminApi.patch(`/notifications/scheduled/${confirmId}/resume`);
      } else {
        await adminApi.delete(`/notifications/scheduled/${confirmId}`);
      }
      setConfirmId(null);
      void loadScheduled(listFilter);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Tabs config ────────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'send',      label: t('notifications.tabSendNow'),   icon: <Send size={12} /> },
    { key: 'schedule',  label: t('notifications.tabSchedule'),  icon: <CalendarClock size={12} /> },
    { key: 'scheduled', label: t('notifications.tabScheduled'), icon: <Clock size={12} /> },
  ];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('notifications.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('notifications.tabSendNow')} · {t('notifications.tabSchedule')}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === tb.key
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tb.icon}
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── Send Now ─────────────────────────────────────────────────────────── */}
      {tab === 'send' && (
        <form onSubmit={handleSend} className="max-w-lg space-y-5">
          <div className="rounded-xl border border-white/[0.07] bg-[#111118] p-5 space-y-4">

            {/* Status banner */}
            {sendStatus && (
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${
                sendStatus === 'ok'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/10 border border-red-500/20 text-red-300'
              }`}>
                {sendStatus === 'ok' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {sendMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">{t('notifications.titleLabel')}</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Market update — new analysis available"
                className={FIELD}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">{t('notifications.body')}</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your notification message here…"
                className={`${FIELD} min-h-[110px] resize-none`}
              />
              <p className="text-[11px] text-slate-600">{body.length} / 200</p>
            </div>

            <div className="border-t border-white/[0.05] pt-4">
              <PlanPicker selected={plans} onToggle={(id) => togglePlan(plans, id, setPlans)} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={sending || !title.trim() || !body.trim()}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold px-5 py-2.5 disabled:opacity-50 transition-all"
            >
              <Send size={14} />
              {sending ? t('common.sending') : t('notifications.send')}
            </button>
            {plans.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Users size={12} />
                {plans.join(', ')}
              </span>
            )}
          </div>
        </form>
      )}

      {/* ── Schedule ─────────────────────────────────────────────────────────── */}
      {tab === 'schedule' && (
        <form onSubmit={handleSchedule} className="max-w-lg space-y-5">
          <div className="rounded-xl border border-white/[0.07] bg-[#111118] p-5 space-y-4">

            {/* Status banner */}
            {schedStatus && (
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${
                schedStatus === 'ok'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/10 border border-red-500/20 text-red-300'
              }`}>
                {schedStatus === 'ok' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {schedMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">{t('notifications.titleLabel')}</label>
              <input
                value={sTitle}
                onChange={(e) => setSTitle(e.target.value)}
                placeholder="e.g. Weekly market recap"
                className={FIELD}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">{t('notifications.body')}</label>
              <textarea
                value={sBody}
                onChange={(e) => setSBody(e.target.value)}
                placeholder="Write your notification message here…"
                className={`${FIELD} min-h-[110px] resize-none`}
              />
              <p className="text-[11px] text-slate-600">{sBody.length} / 200</p>
            </div>

            <div className="border-t border-white/[0.05] pt-4">
              <PlanPicker selected={sPlans} onToggle={(id) => togglePlan(sPlans, id, setSPlans)} />
            </div>

            {/* Date & Time */}
            <div className="border-t border-white/[0.05] pt-4 space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">{t('notifications.scheduledAt')}</label>
              <input
                type="datetime-local"
                value={sScheduledAt}
                onChange={(e) => setSScheduledAt(e.target.value)}
                className={FIELD}
              />
            </div>

            {/* Repeat */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-400">{t('notifications.repeat')}</label>
              <div className="grid grid-cols-2 gap-2">
                {REPEATS.map(({ key, icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSRepeat(key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      sRepeat === key
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                        : 'border-white/[0.08] bg-[#0d0d14] text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <span className={sRepeat === key ? 'text-emerald-400' : 'text-slate-600'}>{icon}</span>
                    {repeatLabel(key)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={scheduling || !sTitle.trim() || !sBody.trim() || !sScheduledAt}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold px-5 py-2.5 disabled:opacity-50 transition-all"
            >
              <CalendarClock size={14} />
              {scheduling ? t('common.saving') : t('notifications.scheduleBtn')}
            </button>
            {sRepeat !== 'NONE' && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Repeat2 size={12} />
                {repeatLabel(sRepeat)}
              </span>
            )}
          </div>
        </form>
      )}

      {/* ── Scheduled list ───────────────────────────────────────────────────── */}
      {tab === 'scheduled' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              {(['PENDING', 'ALL'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setListFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    listFilter === f
                      ? 'bg-white/[0.08] text-white'
                      : 'text-slate-500 hover:text-white'
                  }`}
                >
                  {f === 'PENDING' ? t('notifications.filterPending') : t('notifications.filterAll')}
                </button>
              ))}
            </div>
            <button
              onClick={() => void loadScheduled(listFilter)}
              className="ms-auto p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05] transition-all"
            >
              <RefreshCw size={13} className={listLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <DataTable
            headers={[
              t('notifications.titleLabel'),
              t('notifications.colPlans'),
              t('notifications.colScheduledAt'),
              t('notifications.colRepeat'),
              t('notifications.colSentCount'),
              t('notifications.colStatus'),
              '',
            ]}
            loading={listLoading}
            rowCount={rows.length}
            empty={t('notifications.noScheduled')}
          >
            <>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-sm text-white font-medium truncate">{row.title}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{row.body}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {row.plans.length > 0
                      ? row.plans.map((p) => <Badge key={p} label={p} />)
                      : <span className="flex items-center gap-1 text-slate-500"><Users size={11} /> {t('notifications.allPlans')}</span>
                    }
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-xs text-slate-300 tabular-nums">
                      {new Date(row.scheduledAt).toLocaleString()}
                    </p>
                    {row.repeat !== 'NONE' && row.status === 'PENDING' && (
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Next: {new Date(row.nextSendAt).toLocaleString()}
                      </p>
                    )}
                    {row.lastSentAt && (
                      <p className="text-[11px] text-emerald-600 mt-0.5">
                        Last: {new Date(row.lastSentAt).toLocaleString()}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {row.repeat !== 'NONE' && <Repeat2 size={11} className="inline me-1 text-slate-600" />}
                    {repeatLabel(row.repeat)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 tabular-nums text-center">
                    {row.sentCount}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {row.status === 'PENDING' && (
                        <button
                          onClick={() => { setConfirmId(row.id); setConfirmAction('cancel'); }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition-all"
                        >
                          <XCircle size={13} />
                          {t('notifications.cancelSchedule')}
                        </button>
                      )}
                      {row.status === 'CANCELLED' && (
                        <button
                          onClick={() => { setConfirmId(row.id); setConfirmAction('resume'); }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all"
                        >
                          <PlayCircle size={13} />
                          {t('notifications.resumeSchedule')}
                        </button>
                      )}
                      <button
                        onClick={() => { setConfirmId(row.id); setConfirmAction('delete'); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                      >
                        <Trash2 size={13} />
                        {t('notifications.deleteSchedule')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </>
          </DataTable>
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmId != null}
        title={
          confirmAction === 'cancel' ? t('notifications.cancelScheduleTitle') :
          confirmAction === 'resume' ? t('notifications.resumeScheduleTitle') :
          t('notifications.deleteScheduleTitle')
        }
        message={
          confirmAction === 'cancel' ? t('notifications.confirmCancel') :
          confirmAction === 'resume' ? t('notifications.confirmResume') :
          t('notifications.confirmDelete')
        }
        confirmLabel={
          confirmAction === 'cancel' ? t('notifications.confirmCancelBtn') :
          confirmAction === 'resume' ? t('notifications.confirmResumeBtn') :
          t('notifications.confirmDeleteBtn')
        }
        danger={confirmAction === 'delete'}
        loading={actionLoading}
        onConfirm={handleConfirmedAction}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
