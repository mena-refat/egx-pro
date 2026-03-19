import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import {
  RefreshCw, Users, Star, UserCheck,
  CheckSquare, ArrowUpDown, TrendingUp, ChevronRight, AlertTriangle,
  Inbox, Send, X, Filter, ArrowUpCircle, Zap, Clock, Plus, Trash2,
} from 'lucide-react';
import { useAdminStore } from '../store/adminAuthStore';

/* ─── Types ─────────────────────────────────────────────────── */
type Ticket = {
  id: string; subject: string; message: string; status: string; priority: string;
  assignedTo: number | null; assignedAt: string | null;
  assignedAgent: { fullName: string; email: string } | null;
  reply: string | null; repliedAt: string | null; rating: number | null;
  escalatedAt: string | null; escalatedBy: number | null; escalationNote: string | null;
  escalatedToManager: number | null;
  createdAt: string;
  user: { id: number; email: string | null; username: string | null; fullName: string | null; plan: string };
};
type AgentStat = {
  agent: { id: number; fullName: string; email: string };
  total: number; resolved: number; active: number;
  avgRating: number | null; ratingCount: number; avgResponseHours: number | null;
};
type ManagerStat = {
  manager: { id: number; fullName: string; email: string };
  teamSize: number; teamTotal: number; teamResolved: number;
  teamResolveRate: number; avgAssignmentHours: number | null;
};
type MyStats = {
  total: number; resolved: number; active: number;
  avgRating: number | null; ratingCount: number; avgResponseHours: number | null;
};
type Agent = { id: number; fullName: string; email: string };
type QuickReply = { id: number; title: string; content: string };

/* ─── Helpers ────────────────────────────────────────────────── */
const fmt = (n: number) => Number(n.toFixed(1)).toString();

/** Returns true if a ticket is open/in-progress and older than 24 hours with no reply */
function isOverdue(tk: Ticket): boolean {
  if (tk.status !== 'OPEN' && tk.status !== 'IN_PROGRESS') return false;
  if (tk.reply) return false;
  return Date.now() - new Date(tk.createdAt).getTime() > 24 * 60 * 60 * 1000;
}

const STATUS_BAR: Record<string, string> = {
  OPEN: 'bg-blue-500', IN_PROGRESS: 'bg-amber-500',
  RESOLVED: 'bg-emerald-500', CLOSED: 'bg-slate-600',
};
const PRIORITY_DOT: Record<string, string> = {
  URGENT: 'bg-red-500', HIGH: 'bg-orange-400',
  NORMAL: 'bg-slate-500', LOW: 'bg-slate-700',
};
const PRIORITY_TEXT: Record<string, string> = {
  URGENT: 'text-red-400', HIGH: 'text-orange-400',
  NORMAL: 'text-slate-400', LOW: 'text-slate-600',
};

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-base font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-[10px] text-slate-500 leading-tight">{label}</span>
    </div>
  );
}

function resolveColor(rate: number) {
  return rate >= 80 ? 'text-emerald-400' : rate >= 50 ? 'text-amber-400' : 'text-red-400';
}
function responseColor(h: number | null) {
  if (h === null) return 'text-slate-500';
  return h <= 2 ? 'text-emerald-400' : h <= 6 ? 'text-amber-400' : 'text-red-400';
}

/* ─── Agent Card ─────────────────────────────────────────────── */
function AgentCard({ s, t, onViewTickets }: { s: AgentStat; t: (k: string) => string; onViewTickets?: () => void }) {
  const rate = s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 0;
  return (
    <div className="bg-[#111118] border border-white/[0.07] rounded-xl p-4 space-y-3 hover:border-white/[0.12] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-700/30 border border-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-300 shrink-0">
            {(s.agent.fullName?.[0] ?? s.agent.email?.[0] ?? '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{s.agent.fullName || '—'}</p>
            <p className="text-[10px] text-slate-500 truncate">{s.agent.email}</p>
          </div>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
          s.active > 5 ? 'bg-red-500/15 text-red-400' : s.active > 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
        }`}>
          {s.active} {t('support.activeTickets')}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center py-2 border-y border-white/[0.05]">
        <StatPill label={t('support.totalTickets')} value={s.total} color="text-white" />
        <StatPill label={t('support.resolved')} value={s.resolved} color="text-emerald-400" />
        <StatPill label={t('support.rating')} value={s.avgRating ? `${fmt(s.avgRating)}★` : '—'} color="text-amber-400" />
        <StatPill label={t('support.avgResponse')} value={s.avgResponseHours !== null ? `${s.avgResponseHours}h` : '—'} color={responseColor(s.avgResponseHours)} />
      </div>

      <div>
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-slate-500">{t('support.resolveRate')}</span>
          <span className={`font-bold ${resolveColor(rate)}`}>{rate}%</span>
        </div>
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }} />
        </div>
      </div>

      {onViewTickets && (
        <button
          onClick={onViewTickets}
          className="w-full text-[10px] text-blue-400 hover:text-blue-300 text-center transition-colors pt-1"
        >
          {t('support.viewTeam')}
        </button>
      )}
    </div>
  );
}

/* ─── Manager Card ───────────────────────────────────────────── */
function ManagerCard({ s, t, onClick }: { s: ManagerStat; t: (k: string) => string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-[#111118] border border-white/[0.07] hover:border-violet-500/30 rounded-xl p-4 space-y-3 transition-all text-start w-full group"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/30 to-violet-700/30 border border-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-300 shrink-0">
            {(s.manager.fullName?.[0] ?? s.manager.email?.[0] ?? '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{s.manager.fullName || '—'}</p>
            <p className="text-[11px] text-slate-500 truncate">{s.manager.email}</p>
          </div>
        </div>
        <ChevronRight size={14} className="text-slate-600 group-hover:text-violet-400 transition-colors shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: t('support.teamSize'), value: s.teamSize, color: 'text-blue-400' },
          { label: t('support.teamTotal'), value: s.teamTotal, color: 'text-white' },
          {
            label: t('support.teamResolveRate'),
            value: `${s.teamResolveRate}%`,
            color: resolveColor(s.teamResolveRate),
          },
          {
            label: t('support.avgAssignmentTime'),
            value: s.avgAssignmentHours !== null ? `${s.avgAssignmentHours}h` : '—',
            color: responseColor(s.avgAssignmentHours),
          },
        ].map((item) => (
          <div key={item.label} className="bg-white/[0.03] rounded-lg px-3 py-2">
            <p className={`text-sm font-bold tabular-nums ${item.color}`}>{item.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-violet-400 group-hover:text-violet-300 transition-colors flex items-center gap-1 justify-end">
        {t('support.viewTeam')} <ChevronRight size={10} />
      </div>
    </button>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function SupportPage() {
  const { t } = useTranslation();
  const currentAdmin = useAdminStore((s) => s.admin);
  const isSuperAdmin = currentAdmin?.role === 'SUPER_ADMIN';

  /* Permissions */
  const hasManage = isSuperAdmin || !!(currentAdmin?.permissions?.includes('support.manage'));
  const canReply =
    isSuperAdmin ||
    currentAdmin?.permissions?.includes('support.reply') ||
    hasManage;
  const canAssign = isSuperAdmin || currentAdmin?.permissions?.includes('support.assign') || hasManage;
  const managerMode = hasManage;
  // Agents can escalate: they have support.reply but NOT support.manage/super-admin
  const canEscalate = !!(currentAdmin?.permissions?.includes('support.reply')) && !hasManage;

  /* View state */
  const [view, setView]                   = useState<'tickets' | 'team'>('tickets');
  const [selectedManager, setSelectedManager] = useState<ManagerStat | null>(null);

  /* Ticket state */
  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [statusFilter, setStatus]   = useState('');
  const [priorityFilter, setPrio]   = useState('');
  const [agentFilter, setAgent]     = useState('');
  const [sortOrder, setSort]        = useState('oldest');
  const [loading, setLoading]       = useState(false);
  const [selected, setSelected]     = useState<Ticket | null>(null);

  /* Reply */
  const [reply, setReply]           = useState('');
  const [newStatus, setNewStatus]   = useState('RESOLVED');
  const [saving, setSaving]         = useState(false);

  /* Assign */
  const [assignTarget, setAssignTarget] = useState<Ticket | null>(null);
  const [assignTo, setAssignTo]         = useState('');
  const [assigning, setAssigning]       = useState(false);
  const [agents, setAgents]             = useState<Agent[]>([]);

  /* Escalate */
  const [escalateTarget, setEscalateTarget] = useState<Ticket | null>(null);
  const [escalateNote, setEscalateNote]     = useState('');
  const [escalating, setEscalating]         = useState(false);
  const [escalateError, setEscalateError]   = useState('');

  /* Bulk */
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [bulkAgentId, setBulkAgentId]       = useState('');
  const [bulkAssigning, setBulkAssigning]   = useState(false);
  const [bulkStatusing, setBulkStatusing]   = useState(false);

  /* Quick replies */
  const [quickReplies, setQuickReplies]         = useState<QuickReply[]>([]);
  const [showQRDropdown, setShowQRDropdown]     = useState(false);
  const [showManageQR, setShowManageQR]         = useState(false);
  const [newQRTitle, setNewQRTitle]             = useState('');
  const [newQRContent, setNewQRContent]         = useState('');
  const [savingQR, setSavingQR]                 = useState(false);

  /* Team stats */
  const [agentStats, setAgentStats]         = useState<AgentStat[]>([]);
  const [managerStats, setManagerStats]     = useState<ManagerStat[]>([]);
  const [globalUnassigned, setGlobalUnassigned] = useState(0);
  const [statsLoading, setStatsLoading]     = useState(false);
  const [myStats, setMyStats]               = useState<MyStats | null>(null);

  const skipNext = useRef(false);

  /* ── Load tickets ── */
  const load = useCallback(async (p: number, s: string, pr: string, a: string, srt: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p) };
      if (s) params.status = s;
      if (pr) params.priority = pr;
      if (srt) params.sort = srt;
      if (a) params.agentId = a;
      else if (!managerMode) params.agentId = '';
      const r = await adminApi.get('/support', { params });
      setTickets(r.data.data.tickets ?? []);
      setTotal(r.data.data.total ?? 0);
    } catch { setTickets([]); }
    finally { setLoading(false); }
  }, [managerMode]);

  /* ── Load agents ── */
  useEffect(() => {
    if (canAssign) {
      adminApi.get('/support/agents').then((r) => setAgents(r.data.data ?? [])).catch(() => null);
    }
  }, [canAssign]);

  /* ── Load quick replies ── */
  const loadQuickReplies = useCallback(() => {
    if (canReply) {
      adminApi.get('/support/quick-replies').then((r) => setQuickReplies(r.data.data ?? [])).catch(() => null);
    }
  }, [canReply]);

  useEffect(() => { loadQuickReplies(); }, [loadQuickReplies]);

  /* ── Load own stats (agent only) ── */
  useEffect(() => {
    if (!managerMode && currentAdmin?.permissions?.includes('support.reply')) {
      adminApi.get('/support/my-stats').then((r) => setMyStats(r.data.data)).catch(() => null);
    }
  }, [managerMode, currentAdmin]);

  /* ── Initial load ── */
  useEffect(() => {
    void load(1, '', '', '', sortOrder);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return; }
    void load(page, statusFilter, priorityFilter, agentFilter, sortOrder);
  }, [page]); // eslint-disable-line

  /* ── Load team stats ── */
  const loadTeamStats = useCallback(async (managerId?: number) => {
    setStatsLoading(true);
    try {
      if (isSuperAdmin && managerId === undefined) {
        const r = await adminApi.get('/support/managers/stats');
        setManagerStats(r.data.data.managers ?? []);
        setGlobalUnassigned(r.data.data.globalUnassigned ?? 0);
        setAgentStats([]);
      } else {
        const params: Record<string, string> = {};
        if (managerId !== undefined) params.managerId = String(managerId);
        const r = await adminApi.get('/support/agents/stats', { params });
        setAgentStats(r.data.data.agents ?? []);
        setManagerStats([]);
      }
    } catch { setAgentStats([]); setManagerStats([]); }
    finally { setStatsLoading(false); }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (view === 'team') {
      if (isSuperAdmin && !selectedManager) void loadTeamStats();
      else if (isSuperAdmin && selectedManager) void loadTeamStats(selectedManager.manager.id);
      else void loadTeamStats();
    }
  }, [view, selectedManager]); // eslint-disable-line

  /* ── Handlers ── */
  const handleReply = async () => {
    if (!selected || !reply.trim()) return;
    setSaving(true);
    try {
      await adminApi.patch(`/support/${selected.id}/reply`, { reply, status: newStatus });
      setSelected(null); setReply('');
      void load(page, statusFilter, priorityFilter, agentFilter, sortOrder);
    } finally { setSaving(false); }
  };

  const handleAssign = async () => {
    if (!assignTarget) return;
    setAssigning(true);
    try {
      await adminApi.patch(`/support/${assignTarget.id}/assign`, { agentId: assignTo ? parseInt(assignTo, 10) : null });
      setAssignTarget(null); setAssignTo('');
      void load(page, statusFilter, priorityFilter, agentFilter, sortOrder);
    } finally { setAssigning(false); }
  };

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0 || !bulkAgentId) return;
    setBulkAssigning(true);
    try {
      await adminApi.post('/support/bulk-assign', { ticketIds: [...selectedIds], agentId: parseInt(bulkAgentId, 10) });
      setSelectedIds(new Set()); setBulkAgentId('');
      void load(page, statusFilter, priorityFilter, agentFilter, sortOrder);
    } finally { setBulkAssigning(false); }
  };

  const handleBulkStatus = async (status: 'RESOLVED' | 'CLOSED') => {
    if (selectedIds.size === 0) return;
    setBulkStatusing(true);
    try {
      await adminApi.post('/support/bulk-status', { ticketIds: [...selectedIds], status });
      setSelectedIds(new Set());
      void load(page, statusFilter, priorityFilter, agentFilter, sortOrder);
    } finally { setBulkStatusing(false); }
  };

  const handleAddQuickReply = async () => {
    if (!newQRTitle.trim() || !newQRContent.trim()) return;
    setSavingQR(true);
    try {
      await adminApi.post('/support/quick-replies', { title: newQRTitle.trim(), content: newQRContent.trim() });
      setNewQRTitle(''); setNewQRContent('');
      loadQuickReplies();
    } finally { setSavingQR(false); }
  };

  const handleDeleteQuickReply = async (id: number) => {
    await adminApi.delete(`/support/quick-replies/${id}`).catch(() => null);
    loadQuickReplies();
  };

  const handleEscalate = async () => {
    if (!escalateTarget) return;
    setEscalating(true);
    setEscalateError('');
    try {
      await adminApi.post(`/support/${escalateTarget.id}/escalate`, { note: escalateNote });
      setEscalateTarget(null);
      setEscalateNote('');
      setSelected(null);
      void load(page, statusFilter, priorityFilter, agentFilter, sortOrder);
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'NO_MANAGER_ASSIGNED') setEscalateError(t('support.escalateNoManager'));
      else if (code === 'ALREADY_ESCALATED') setEscalateError(t('support.alreadyEscalated'));
      else setEscalateError(t('login.loginFailed'));
    } finally {
      setEscalating(false);
    }
  };

  const applyFilter = (s: string, pr: string, a: string, srt: string) => {
    skipNext.current = true;
    setPage(1);
    void load(1, s, pr, a, srt);
  };

  /* ─── RENDER ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('support.title')}</h1>
          <p className="text-sm text-slate-500">{total} {t('support.tickets')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex gap-0.5 p-0.5 bg-white/[0.04] border border-white/[0.06] rounded-lg">
            {([
              { key: 'tickets', label: t('support.ticketsView'), icon: <Inbox size={12} /> },
              ...(managerMode ? [{ key: 'team', label: t('support.teamView'), icon: <Users size={12} /> }] : []),
            ] as { key: 'tickets' | 'team'; label: string; icon: React.ReactNode }[]).map((item) => (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  view === item.key ? 'bg-white/[0.1] text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {item.icon}{item.label}
              </button>
            ))}
          </div>

          {managerMode && (
            <button
              onClick={() => setShowManageQR(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-violet-500/25 text-violet-400 hover:bg-violet-500/10 text-xs font-medium transition-all"
            >
              <Zap size={12} /> {t('support.quickReplies')}
            </button>
          )}
          <button
            onClick={() => void load(page, statusFilter, priorityFilter, agentFilter, sortOrder)}
            className="p-2 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── My Performance (agent only) ── */}
      {!managerMode && myStats && view === 'tickets' && (
        <div className="rounded-xl border border-blue-500/20 bg-[#111118] p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={13} className="text-blue-400" />
            <h2 className="text-xs font-semibold text-white">{t('support.myPerformance')}</h2>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: t('support.totalTickets'), value: myStats.total, color: 'text-white' },
              { label: t('support.activeTickets'), value: myStats.active, color: myStats.active > 5 ? 'text-red-400' : myStats.active > 0 ? 'text-amber-400' : 'text-emerald-400' },
              { label: t('support.resolved'), value: myStats.resolved, color: 'text-emerald-400' },
              { label: t('support.resolveRate'), value: myStats.total > 0 ? `${Math.round((myStats.resolved / myStats.total) * 100)}%` : '—', color: resolveColor(myStats.total > 0 ? Math.round((myStats.resolved / myStats.total) * 100) : 0) },
              { label: t('support.avgResponse'), value: myStats.avgResponseHours !== null ? `${myStats.avgResponseHours}h` : '—', color: responseColor(myStats.avgResponseHours) },
              { label: t('support.rating'), value: myStats.avgRating ? `${fmt(myStats.avgRating)}★` : '—', color: 'text-amber-400' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
                <span className={`text-lg font-bold tabular-nums block ${item.color}`}>{item.value}</span>
                <span className="text-[10px] text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ TICKETS VIEW ════ */}
      {view === 'tickets' && (
        <>
          {/* Filters bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Filter size={12} />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => { setStatus(e.target.value); applyFilter(e.target.value, priorityFilter, agentFilter, sortOrder); }}
              className="px-2.5 py-1.5 text-xs bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none"
            >
              <option value="">{t('support.all')}</option>
              <option value="OPEN">{t('support.open')}</option>
              <option value="IN_PROGRESS">{t('support.inProgress')}</option>
              <option value="RESOLVED">{t('support.resolved')}</option>
              <option value="CLOSED">{t('support.closed')}</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => { setPrio(e.target.value); applyFilter(statusFilter, e.target.value, agentFilter, sortOrder); }}
              className="px-2.5 py-1.5 text-xs bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none"
            >
              <option value="">{t('support.priorityFilter')}</option>
              <option value="URGENT">URGENT</option>
              <option value="HIGH">HIGH</option>
              <option value="NORMAL">NORMAL</option>
              <option value="LOW">LOW</option>
            </select>

            {managerMode && (
              <select
                value={agentFilter}
                onChange={(e) => { setAgent(e.target.value); applyFilter(statusFilter, priorityFilter, e.target.value, sortOrder); }}
                className="px-2.5 py-1.5 text-xs bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none"
              >
                <option value="">{t('support.allAgents')}</option>
                <option value="unassigned">{t('support.unassigned')}</option>
                {agents.map((a) => <option key={a.id} value={String(a.id)}>{a.fullName || a.email}</option>)}
              </select>
            )}

            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-[#111118] border border-white/[0.08] rounded-lg">
              <ArrowUpDown size={11} className="text-slate-500" />
              <select
                value={sortOrder}
                onChange={(e) => { setSort(e.target.value); applyFilter(statusFilter, priorityFilter, agentFilter, e.target.value); }}
                className="text-xs bg-transparent text-slate-300 focus:outline-none"
              >
                <option value="oldest">{t('support.sortOldest')}</option>
                <option value="newest">{t('support.sortNewest')}</option>
                <option value="priority">{t('support.sortPriority')}</option>
              </select>
            </div>

            {managerMode && selectedIds.size === 0 && (
              <div className="ms-auto flex items-center gap-2">
                <span className="text-[10px] text-slate-600">{t('support.quickSelect')}:</span>
                {[10, 50].map((n) => (
                  <button key={n} onClick={() => {
                    const unassigned = tickets.filter((tk) => !tk.assignedTo).slice(0, n);
                    setSelectedIds(new Set(unassigned.map((tk) => tk.id)));
                  }} className="px-2 py-1 text-[10px] font-medium bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-md transition-all flex items-center gap-1">
                    <CheckSquare size={10} /> {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Split panel */}
          <div className={`grid gap-4 ${selected ? 'grid-cols-1 lg:grid-cols-[1fr_420px]' : 'grid-cols-1'}`}>

            {/* ── Left: Ticket list ── */}
            <div className="space-y-1.5">
              {loading && (
                <div className="flex items-center justify-center py-16 text-slate-600 text-sm">{t('common.loading')}</div>
              )}
              {!loading && tickets.length === 0 && (
                <div className="flex items-center justify-center py-16 text-slate-600 text-sm">{t('support.noTickets')}</div>
              )}
              {tickets.map((tk) => (
                <button
                  key={tk.id}
                  onClick={() => { setSelected(tk); setReply(tk.reply ?? ''); setNewStatus('RESOLVED'); }}
                  className={`w-full text-start flex items-stretch gap-0 rounded-xl border transition-all overflow-hidden ${
                    selected?.id === tk.id
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-white/[0.06] bg-[#111118] hover:border-white/[0.12] hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Status bar */}
                  <div className={`w-1 shrink-0 ${STATUS_BAR[tk.status] ?? 'bg-slate-600'}`} />

                  <div className="flex-1 px-3.5 py-2.5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          {managerMode && (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(tk.id)}
                              disabled={!!tk.assignedTo}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(tk.id); else next.delete(tk.id);
                                  return next;
                                });
                              }}
                              className="w-3 h-3 rounded accent-blue-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          )}
                          <p className="text-xs font-semibold text-white truncate">{tk.subject}</p>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{tk.message}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="text-[10px] text-slate-600 whitespace-nowrap">{timeAgo(tk.createdAt)}</span>
                        <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[tk.priority] ?? 'bg-slate-600'}`} title={tk.priority} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge label={tk.status} />
                      <span className={`text-[10px] font-medium ${PRIORITY_TEXT[tk.priority] ?? 'text-slate-500'}`}>{tk.priority}</span>
                      {tk.user && (
                        <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                          {tk.user.fullName ?? tk.user.username ?? tk.user.email ?? '—'}
                        </span>
                      )}
                      {tk.assignedAgent ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/15">
                          {tk.assignedAgent.fullName || tk.assignedAgent.email}
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/15 flex items-center gap-0.5">
                          <AlertTriangle size={8} /> {t('support.unassigned')}
                        </span>
                      )}
                      {tk.rating && (
                        <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                          <Star size={9} fill="currentColor" /> {tk.rating}
                        </span>
                      )}
                      {tk.escalatedAt && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/15 flex items-center gap-0.5">
                          <ArrowUpCircle size={8} /> {t('support.escalatedBadge')}
                        </span>
                      )}
                      {isOverdue(tk) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-600/15 text-red-400 border border-red-600/20 flex items-center gap-0.5 font-semibold">
                          <Clock size={8} /> {t('support.overdue')}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              <div className="pt-2">
                <Pagination page={page} totalPages={Math.ceil(total / 20)} total={total} limit={20} onChange={(p) => {
                  skipNext.current = false;
                  setPage(p);
                }} />
              </div>
            </div>

            {/* ── Right: Ticket detail ── */}
            {selected && (
              <div className="lg:sticky lg:top-4 self-start space-y-3 rounded-xl border border-white/[0.08] bg-[#111118] overflow-hidden">
                {/* Detail header */}
                <div className="flex items-start justify-between gap-3 px-4 pt-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white leading-snug">{selected.subject}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge label={selected.status} />
                      <span className={`text-[10px] font-semibold ${PRIORITY_TEXT[selected.priority] ?? ''}`}>{selected.priority}</span>
                      <span className="text-[10px] text-slate-500">{new Date(selected.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="shrink-0 text-slate-600 hover:text-slate-300 transition-colors mt-0.5">
                    <X size={14} />
                  </button>
                </div>

                {/* User info */}
                <div className="mx-4 rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2">
                  <p className="text-[11px] text-slate-400">
                    <span className="text-slate-500">From: </span>
                    <span className="font-medium text-slate-200">{selected.user?.fullName ?? selected.user?.username ?? '—'}</span>
                    {selected.user?.email && <span className="text-slate-500"> · {selected.user.email}</span>}
                    <span className="text-slate-600"> · {selected.user?.plan}</span>
                  </p>
                  {selected.assignedAgent && (
                    <p className="text-[11px] mt-1">
                      <span className="text-slate-500">Agent: </span>
                      <span className="text-blue-400 font-medium">{selected.assignedAgent.fullName || selected.assignedAgent.email}</span>
                    </p>
                  )}
                </div>

                {/* Conversation */}
                <div className="mx-4 space-y-2 max-h-48 overflow-y-auto">
                  {/* Original message */}
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
                    <p className="text-[10px] text-slate-500 mb-1.5">{t('support.originalMessage')}</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{selected.message}</p>
                  </div>
                  {/* Previous reply */}
                  {selected.reply && (
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] text-emerald-400 font-medium">{t('support.previousReply')}</p>
                        {selected.repliedAt && <p className="text-[10px] text-slate-600">{timeAgo(selected.repliedAt)}</p>}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{selected.reply}</p>
                      {selected.rating != null && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400">
                          <Star size={9} fill="currentColor" /> {selected.rating}/5
                        </div>
                      )}
                    </div>
                  )}
                  {/* Escalation note (visible to managers) */}
                  {selected.escalatedAt && managerMode && (
                    <div className="rounded-lg bg-orange-500/5 border border-orange-500/20 px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] text-orange-400 font-medium flex items-center gap-1">
                          <ArrowUpCircle size={9} /> {t('support.escalatedBadge')}
                        </p>
                        <p className="text-[10px] text-slate-600">{timeAgo(selected.escalatedAt)}</p>
                      </div>
                      {selected.escalationNote && (
                        <p className="text-xs text-slate-300 leading-relaxed">{selected.escalationNote}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 space-y-3">
                  {/* Assign button */}
                  {canAssign && (
                    <button
                      onClick={() => { setAssignTarget(selected); setAssignTo(selected.assignedTo ? String(selected.assignedTo) : ''); }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-blue-500/25 text-blue-400 hover:bg-blue-500/10 transition-all"
                    >
                      <UserCheck size={12} /> {t('support.assign')}
                    </button>
                  )}

                  {/* Escalate button — agents only, assigned to them, not yet escalated, ticket still open/in-progress */}
                  {canEscalate && selected.assignedTo === currentAdmin?.id && !selected.escalatedAt &&
                   (selected.status === 'OPEN' || selected.status === 'IN_PROGRESS') && (
                    <button
                      onClick={() => { setEscalateTarget(selected); setEscalateNote(''); setEscalateError(''); }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-orange-500/25 text-orange-400 hover:bg-orange-500/10 transition-all"
                    >
                      <ArrowUpCircle size={12} /> {t('support.escalate')}
                    </button>
                  )}
                  {/* Escalated label — show agent their ticket was escalated */}
                  {canEscalate && selected.escalatedAt && (
                    <div className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-orange-500/15 bg-orange-500/5 text-orange-400">
                      <ArrowUpCircle size={12} /> {t('support.escalated')} · {timeAgo(selected.escalatedAt)}
                    </div>
                  )}

                  {/* Reply form — only when ticket is open/in-progress */}
                  {canReply && (
                    selected.status === 'RESOLVED' || selected.status === 'CLOSED' ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800/50 border border-white/[0.06] text-xs text-slate-500">
                        <X size={12} className="shrink-0" />
                        {t('support.ticketClosed')}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <textarea
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            rows={3}
                            placeholder={t('support.yourReply')}
                            className="w-full px-3 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50 resize-none placeholder-slate-600"
                          />
                          {quickReplies.length > 0 && (
                            <div className="absolute bottom-2 end-2">
                              <button
                                type="button"
                                onClick={() => setShowQRDropdown((v) => !v)}
                                className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-md bg-violet-500/15 border border-violet-500/20 text-violet-400 hover:bg-violet-500/25 transition-all"
                              >
                                <Zap size={9} /> {t('support.quickReplies')}
                              </button>
                              {showQRDropdown && (
                                <div className="absolute bottom-7 end-0 w-64 bg-[#1a1a2e] border border-white/[0.1] rounded-xl shadow-2xl z-50 overflow-hidden">
                                  {quickReplies.map((qr) => (
                                    <button
                                      key={qr.id}
                                      type="button"
                                      onClick={() => { setReply(qr.content); setShowQRDropdown(false); }}
                                      className="w-full text-start px-3 py-2 hover:bg-white/[0.05] transition-colors border-b border-white/[0.05] last:border-0"
                                    >
                                      <p className="text-[11px] font-medium text-white">{qr.title}</p>
                                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{qr.content}</p>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="flex-1 px-2 py-1.5 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none"
                          >
                            <option value="IN_PROGRESS">{t('support.inProgress')}</option>
                            <option value="RESOLVED">{t('support.resolved')}</option>
                            <option value="CLOSED">{t('support.closed')}</option>
                          </select>
                          <button
                            onClick={() => void handleReply()}
                            disabled={saving || !reply.trim()}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all whitespace-nowrap"
                          >
                            <Send size={11} /> {saving ? t('common.sending') : t('support.sendReply')}
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════ TEAM VIEW ════ */}
      {view === 'team' && managerMode && (
        <div className="space-y-4">

          {/* Breadcrumb / back for Super Admin manager drill-down */}
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              {selectedManager ? (
                <>
                  <button
                    onClick={() => { setSelectedManager(null); }}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
                  >
                    {t('support.backToManagers')}
                  </button>
                  <ChevronRight size={12} className="text-slate-600" />
                  <span className="text-xs text-white font-medium">{selectedManager.manager.fullName || selectedManager.manager.email}</span>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Users size={13} className="text-violet-400" />
                  <span className="text-xs font-semibold text-white">{t('support.managers')}</span>
                  {globalUnassigned > 0 && (
                    <span className="ms-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/20 flex items-center gap-1">
                      <AlertTriangle size={9} /> {globalUnassigned} {t('support.globalUnassigned')}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {statsLoading && (
            <div className="flex items-center justify-center py-16 text-slate-600 text-sm">{t('common.loading')}</div>
          )}

          {/* Manager cards (Super Admin, no manager selected) */}
          {!statsLoading && isSuperAdmin && !selectedManager && (
            <>
              {managerStats.length === 0 && (
                <div className="text-center py-12 text-slate-600 text-sm">{t('support.noManagers')}</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {managerStats.map((s) => (
                  <ManagerCard key={s.manager.id} s={s} t={t} onClick={() => setSelectedManager(s)} />
                ))}
              </div>
            </>
          )}

          {/* Agent cards (when manager selected or non-super-admin manager) */}
          {!statsLoading && (!isSuperAdmin || selectedManager) && (
            <>
              {/* Selected manager summary */}
              {isSuperAdmin && selectedManager && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: t('support.teamSize'), value: selectedManager.teamSize, color: 'text-blue-400' },
                    { label: t('support.teamTotal'), value: selectedManager.teamTotal, color: 'text-white' },
                    { label: t('support.teamResolveRate'), value: `${selectedManager.teamResolveRate}%`, color: resolveColor(selectedManager.teamResolveRate) },
                    { label: t('support.avgAssignmentTime'), value: selectedManager.avgAssignmentHours !== null ? `${selectedManager.avgAssignmentHours}h` : '—', color: responseColor(selectedManager.avgAssignmentHours) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-violet-500/15 bg-[#111118] px-4 py-3">
                      <p className={`text-xl font-bold tabular-nums ${item.color}`}>{item.value}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {agentStats.length === 0 && (
                <div className="text-center py-12 text-slate-600 text-sm">{t('support.noAgents')}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {agentStats.map((s) => (
                  <AgentCard
                    key={s.agent.id}
                    s={s}
                    t={t}
                    onViewTickets={() => {
                      setAgent(String(s.agent.id));
                      setView('tickets');
                      applyFilter(statusFilter, priorityFilter, String(s.agent.id), sortOrder);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Bulk action floating bar ── */}
      {managerMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#12121f] border border-blue-500/25 rounded-2xl px-5 py-3 shadow-2xl shadow-black/40 backdrop-blur-sm flex-wrap justify-center">
          <span className="text-sm font-bold text-white">{selectedIds.size}</span>
          <span className="text-sm text-slate-400">{t('support.ticketsSelected')}</span>
          <div className="w-px h-4 bg-white/[0.1]" />
          <select
            value={bulkAgentId}
            onChange={(e) => setBulkAgentId(e.target.value)}
            className="px-3 py-1.5 text-sm bg-[#1a1a2e] border border-white/[0.1] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500/50 min-w-[160px]"
          >
            <option value="">{t('support.chooseAgent')}</option>
            {agents.map((a) => <option key={a.id} value={String(a.id)}>{a.fullName || a.email}</option>)}
          </select>
          <button
            onClick={() => void handleBulkAssign()}
            disabled={bulkAssigning || !bulkAgentId}
            className="px-4 py-1.5 text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-white rounded-lg disabled:opacity-50 transition-all"
          >
            {bulkAssigning ? t('common.saving') : t('support.confirmAssign')}
          </button>
          <div className="w-px h-4 bg-white/[0.1]" />
          <button
            onClick={() => void handleBulkStatus('RESOLVED')}
            disabled={bulkStatusing}
            className="px-4 py-1.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50 transition-all"
          >
            {t('support.bulkResolve')}
          </button>
          <button
            onClick={() => void handleBulkStatus('CLOSED')}
            disabled={bulkStatusing}
            className="px-4 py-1.5 text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 transition-all"
          >
            {t('support.bulkClose')}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-600 hover:text-slate-300 transition-colors">✕</button>
        </div>
      )}

      {/* ── Escalate Modal ── */}
      <Modal
        open={!!escalateTarget}
        onClose={() => { setEscalateTarget(null); setEscalateNote(''); setEscalateError(''); }}
        title={t('support.escalateTitle')}
      >
        {escalateTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-lg bg-orange-500/5 border border-orange-500/20 px-3 py-3">
              <ArrowUpCircle size={14} className="text-orange-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">{t('support.escalateDesc')}</p>
            </div>
            <div className="bg-[#0d0d14] rounded-lg p-3 border border-white/[0.06]">
              <p className="text-sm font-semibold text-white">{escalateTarget.subject}</p>
              <p className="text-xs text-slate-500 mt-1 truncate">{escalateTarget.message}</p>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('support.escalateNote')}</label>
              <textarea
                value={escalateNote}
                onChange={(e) => setEscalateNote(e.target.value)}
                rows={3}
                placeholder={t('support.escalateNotePlaceholder')}
                className="w-full px-3 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-orange-500/50 resize-none placeholder-slate-600"
              />
            </div>
            {escalateError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{escalateError}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setEscalateTarget(null); setEscalateNote(''); setEscalateError(''); }}
                className="px-4 py-2 text-sm text-slate-400"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => void handleEscalate()}
                disabled={escalating}
                className="px-4 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white rounded-lg disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <ArrowUpCircle size={13} />
                {escalating ? t('support.escalating') : t('support.escalateConfirm')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Assign Modal ── */}
      <Modal open={!!assignTarget} onClose={() => setAssignTarget(null)} title={t('support.assignTicket')}>
        {assignTarget && (
          <div className="space-y-4">
            <div className="bg-[#0d0d14] rounded-lg p-3 border border-white/[0.06]">
              <p className="text-sm font-semibold text-white">{assignTarget.subject}</p>
              <p className="text-xs text-slate-500 mt-1">{assignTarget.user?.fullName ?? assignTarget.user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge label={assignTarget.status} />
                <Badge label={assignTarget.priority} />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('support.assignTo')}</label>
              <select
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-blue-500/50"
              >
                <option value="">{t('support.unassignedOption')}</option>
                {agents.map((a) => <option key={a.id} value={String(a.id)}>{a.fullName || a.email}</option>)}
              </select>
            </div>
            {assignTo && (
              <p className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">{t('support.assignNote')}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setAssignTarget(null)} className="px-4 py-2 text-sm text-slate-400">{t('common.cancel')}</button>
              <button
                onClick={() => void handleAssign()}
                disabled={assigning}
                className="px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-white rounded-lg disabled:opacity-50 transition-all"
              >
                {assigning ? t('common.saving') : t('support.confirmAssign')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Manage Quick Replies Modal (managers only) ── */}
      {managerMode && (
        <Modal
          open={showManageQR}
          onClose={() => setShowManageQR(false)}
          title={t('support.manageQuickReplies')}
        >
          <div className="space-y-4">
            {/* Existing quick replies */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {quickReplies.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">{t('support.noQuickReplies')}</p>
              )}
              {quickReplies.map((qr) => (
                <div key={qr.id} className="flex items-start gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white">{qr.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{qr.content}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteQuickReply(qr.id)}
                    className="shrink-0 text-slate-600 hover:text-red-400 transition-colors mt-0.5"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new quick reply */}
            <div className="border-t border-white/[0.06] pt-4 space-y-2">
              <input
                value={newQRTitle}
                onChange={(e) => setNewQRTitle(e.target.value)}
                placeholder={t('support.quickReplyTitle')}
                maxLength={100}
                className="w-full px-3 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-violet-500/50 placeholder-slate-600"
              />
              <textarea
                value={newQRContent}
                onChange={(e) => setNewQRContent(e.target.value)}
                placeholder={t('support.quickReplyContent')}
                rows={3}
                maxLength={2000}
                className="w-full px-3 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-violet-500/50 resize-none placeholder-slate-600"
              />
              <button
                type="button"
                onClick={() => void handleAddQuickReply()}
                disabled={savingQR || !newQRTitle.trim() || !newQRContent.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-lg disabled:opacity-50 transition-all"
              >
                <Plus size={12} /> {savingQR ? t('common.saving') : t('support.addQuickReply')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
