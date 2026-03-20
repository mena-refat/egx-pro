import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import {
  RefreshCw, Users, Star, UserCheck,
  CheckSquare, ArrowUpDown, TrendingUp, ChevronRight, AlertTriangle,
  Inbox, Send, X, Filter, ArrowUpCircle, Zap, Clock, Plus, Trash2, Pencil,
  Flag, ShieldAlert, ShieldOff, ShieldCheck,
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
type AbuseReport = {
  id: number;
  ticketId: string;
  reason: string;
  status: 'PENDING' | 'WARNED' | 'DISMISSED';
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  ticket: { id: string; subject: string; message: string };
  user: { id: number; email: string | null; username: string | null; fullName: string | null; warningCount: number; isSuspended: boolean };
  reporter: { id: number; fullName: string; email: string };
  reviewer: { id: number; fullName: string } | null;
};

/* ─── Helpers ────────────────────────────────────────────────── */
const fmt = (n: number) => Number(n.toFixed(1)).toString();

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
const PRIORITY_KEY: Record<string, string> = {
  URGENT: 'support.priorityUrgent', HIGH: 'support.priorityHigh',
  NORMAL: 'support.priorityNormal', LOW: 'support.priorityLow',
};

function timeAgo(date: string, locale = 'en') {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  const rtf  = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (diff < 3600)  return rtf.format(-Math.round(diff / 60), 'minute');
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  return rtf.format(-Math.round(diff / 86400), 'day');
}

function userInitial(user: Ticket['user'] | null | undefined) {
  return (user?.fullName?.[0] ?? user?.username?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();
}

function resolveColor(rate: number) {
  return rate >= 80 ? 'text-emerald-400' : rate >= 50 ? 'text-amber-400' : 'text-red-400';
}
function responseColor(h: number | null) {
  if (h === null) return 'text-slate-500';
  return h <= 2 ? 'text-emerald-400' : h <= 6 ? 'text-amber-400' : 'text-red-400';
}

/* ─── Stat Card ──────────────────────────────────────────────── */
function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: ReactNode }) {
  return (
    <div className="bg-[#111118] px-3 py-3 flex flex-col gap-1">
      <div className={`${color} opacity-50`}>{icon}</div>
      <span className={`text-base font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-[10px] text-slate-600 leading-tight">{label}</span>
    </div>
  );
}

/* ─── Agent Card ─────────────────────────────────────────────── */
function AgentCard(_props: { key?: string; s: AgentStat; t: (k: string) => string; onViewTickets?: () => void }) {
  const { s, t, onViewTickets } = _props;
  const rate = s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 0;
  return (
    <div className="bg-[#111118] border border-white/[0.07] rounded-xl overflow-hidden hover:border-white/[0.12] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-300 shrink-0">
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

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-px bg-white/[0.04]">
        {[
          { label: t('support.totalTickets'), value: s.total, color: 'text-white' },
          { label: t('support.resolved'), value: s.resolved, color: 'text-emerald-400' },
          { label: t('support.rating'), value: s.avgRating ? `${fmt(s.avgRating)}★` : '—', color: 'text-amber-400' },
          { label: t('support.avgResponse'), value: s.avgResponseHours !== null ? `${s.avgResponseHours}h` : '—', color: responseColor(s.avgResponseHours) },
        ].map((item) => (
          <div key={item.label} className="bg-[#111118] px-2 py-2.5 text-center">
            <p className={`text-sm font-bold tabular-nums ${item.color}`}>{item.value}</p>
            <p className="text-[9px] text-slate-600 mt-0.5 leading-tight">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Resolve rate */}
      <div className="px-4 py-3">
        <div className="flex justify-between text-[10px] mb-1.5">
          <span className="text-slate-500">{t('support.resolveRate')}</span>
          <span className={`font-bold ${resolveColor(rate)}`}>{rate}%</span>
        </div>
        <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${rate}%` }}
          />
        </div>
        {onViewTickets && (
          <button
            onClick={onViewTickets}
            className="w-full mt-2.5 text-[10px] text-blue-400 hover:text-blue-300 text-center transition-colors flex items-center justify-center gap-1"
          >
            {t('support.viewAgentTickets')} <ChevronRight size={9} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Manager Card ───────────────────────────────────────────── */
function ManagerCard(_props: { key?: string; s: ManagerStat; t: (k: string) => string; onClick: () => void }) {
  const { s, t, onClick } = _props;
  return (
    <button
      onClick={onClick}
      className="bg-[#111118] border border-white/[0.07] hover:border-violet-500/30 rounded-xl overflow-hidden transition-all text-start w-full group"
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-700/20 border border-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-300 shrink-0">
            {(s.manager.fullName?.[0] ?? s.manager.email?.[0] ?? '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{s.manager.fullName || '—'}</p>
            <p className="text-[11px] text-slate-500 truncate">{s.manager.email}</p>
          </div>
        </div>
        <ChevronRight size={14} className="text-slate-600 group-hover:text-violet-400 transition-colors shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
        {[
          { label: t('support.teamSize'), value: s.teamSize, color: 'text-blue-400' },
          { label: t('support.teamTotal'), value: s.teamTotal, color: 'text-white' },
          { label: t('support.teamResolveRate'), value: `${s.teamResolveRate}%`, color: resolveColor(s.teamResolveRate) },
          { label: t('support.avgAssignmentTime'), value: s.avgAssignmentHours !== null ? `${s.avgAssignmentHours}h` : '—', color: responseColor(s.avgAssignmentHours) },
        ].map((item) => (
          <div key={item.label} className="bg-[#111118] px-3 py-2.5">
            <p className={`text-sm font-bold tabular-nums ${item.color}`}>{item.value}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="px-4 py-2.5 flex justify-end">
        <span className="text-[10px] text-violet-500 group-hover:text-violet-300 transition-colors flex items-center gap-1">
          {t('support.viewTeam')} <ChevronRight size={9} />
        </span>
      </div>
    </button>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function SupportPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-GB';
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
  const canEscalate = !!(currentAdmin?.permissions?.includes('support.reply')) && !hasManage;

  /* View state */
  const [view, setView]                   = useState<'tickets' | 'team' | 'abuse'>('tickets');
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
  const [replyError, setReplyError] = useState('');

  /* Assign */
  const [assignTarget, setAssignTarget] = useState<Ticket | null>(null);
  const [assignTo, setAssignTo]         = useState('');
  const [assigning, setAssigning]       = useState(false);
  const [assignError, setAssignError]   = useState('');
  const [agents, setAgents]             = useState<Agent[]>([]);

  /* Escalate */
  const [escalateTarget, setEscalateTarget] = useState<Ticket | null>(null);
  const [escalateNote, setEscalateNote]     = useState('');
  const [escalating, setEscalating]         = useState(false);
  const [escalateError, setEscalateError]   = useState('');

  /* Search */
  const [searchQuery, setSearchQuery]       = useState('');
  const searchTimerRef                      = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Bulk */
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [bulkAgentId, setBulkAgentId]       = useState('');
  const [bulkAssigning, setBulkAssigning]   = useState(false);
  const [bulkStatusing, setBulkStatusing]   = useState(false);
  const [bulkError, setBulkError]           = useState('');
  const [bulkConfirm, setBulkConfirm]       = useState<'RESOLVED' | 'CLOSED' | null>(null);

  /* Abuse report */
  const [reportTarget, setReportTarget]     = useState<Ticket | null>(null);
  const [reportReason, setReportReason]     = useState('');
  const [reporting, setReporting]           = useState(false);
  const [reportError, setReportError]       = useState('');
  const [reportSuccess, setReportSuccess]   = useState(false);

  /* Abuse reviews (manager) */
  const [abuseReports, setAbuseReports]     = useState<AbuseReport[]>([]);
  const [abuseTotal, setAbuseTotal]         = useState(0);
  const [abusePage, setAbusePage]           = useState(1);
  const [abuseFilter, setAbuseFilter]       = useState('PENDING');
  const [abuseLoading, setAbuseLoading]     = useState(false);
  const [resolveTarget, setResolveTarget]   = useState<AbuseReport | null>(null);
  const [resolveAction, setResolveAction]   = useState<'warn' | 'dismiss'>('warn');
  const [resolveNote, setResolveNote]       = useState('');
  const [resolving, setResolving]           = useState(false);
  const [resolveError, setResolveError]     = useState('');

  /* Quick replies */
  const [quickReplies, setQuickReplies]         = useState<QuickReply[]>([]);
  const [showQRDropdown, setShowQRDropdown]     = useState(false);
  const [showManageQR, setShowManageQR]         = useState(false);
  const [newQRTitle, setNewQRTitle]             = useState('');
  const [newQRContent, setNewQRContent]         = useState('');
  const [savingQR, setSavingQR]                 = useState(false);
  const [qrError, setQrError]                   = useState('');
  const [deletingQRId, setDeletingQRId]         = useState<number | null>(null);
  const [editingQRId, setEditingQRId]           = useState<number | null>(null);
  const [editQRTitle, setEditQRTitle]           = useState('');
  const [editQRContent, setEditQRContent]       = useState('');
  const [savingEditQR, setSavingEditQR]         = useState(false);
  const qrDropdownRef                           = useRef<HTMLDivElement>(null);

  /* Team stats */
  const [agentStats, setAgentStats]         = useState<AgentStat[]>([]);
  const [managerStats, setManagerStats]     = useState<ManagerStat[]>([]);
  const [globalUnassigned, setGlobalUnassigned] = useState(0);
  const [statsLoading, setStatsLoading]     = useState(false);
  const [myStats, setMyStats]               = useState<MyStats | null>(null);

  const skipNext = useRef(false);

  /* ── Load tickets ── */
  const load = useCallback(async (p: number, s: string, pr: string, a: string, srt: string, srch = '', silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p) };
      if (s) params.status = s;
      if (pr) params.priority = pr;
      if (srt) params.sort = srt;
      if (a) params.agentId = a;
      else if (!managerMode) params.agentId = '';
      if (srch) params.search = srch;
      const r = await adminApi.get('/support', { params });
      setTickets(r.data.data.tickets ?? []);
      setTotal(r.data.data.total ?? 0);
    } catch { if (!silent) setTickets([]); }
    finally { if (!silent) setLoading(false); }
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

  /* ── QR dropdown: close on outside click ── */
  useEffect(() => {
    if (!showQRDropdown) return;
    const handle = (e: MouseEvent) => {
      if (qrDropdownRef.current && !qrDropdownRef.current.contains(e.target as Node)) {
        setShowQRDropdown(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showQRDropdown]);

  /* ── Reset reply state when selected ticket changes ── */
  useEffect(() => {
    setReplyError('');
    setShowQRDropdown(false);
  }, [selected?.id]);

  /* ── Polling ── */
  const currentParamsRef = useRef({ page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery });
  useEffect(() => {
    currentParamsRef.current = { page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery };
  }, [page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery]);

  useEffect(() => {
    if (view !== 'tickets') return;
    const id = setInterval(() => {
      const p = currentParamsRef.current;
      void load(p.page, p.statusFilter, p.priorityFilter, p.agentFilter, p.sortOrder, p.searchQuery, true);
    }, 30_000);
    return () => clearInterval(id);
  }, [view, load]);

  /* ── Escape: close ticket panel ── */
  useEffect(() => {
    if (!selected) return;
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [selected]);

  /* ── Search timer cleanup ── */
  useEffect(() => () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); }, []);

  /* ── Own stats (agent only) ── */
  useEffect(() => {
    if (!managerMode && currentAdmin?.permissions?.includes('support.reply')) {
      adminApi.get('/support/my-stats').then((r) => setMyStats(r.data.data)).catch(() => null);
    }
  }, [managerMode, currentAdmin]);

  /* ── Initial load ── */
  useEffect(() => {
    void load(1, '', '', '', sortOrder, '');
  }, []); // eslint-disable-line

  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return; }
    void load(page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery);
  }, [page]); // eslint-disable-line

  /* ── Team stats ── */
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
    setReplyError('');
    try {
      const res = await adminApi.patch(`/support/${selected.id}/reply`, { reply, status: newStatus });
      const patch = res.data.data as Ticket;
      const updated: Ticket = { ...patch, user: selected.user, assignedAgent: selected.assignedAgent };
      setSelected(updated);
      setTickets((prev) => prev.map((tk) => tk.id === updated.id ? updated : tk));
      setReply('');
      setShowQRDropdown(false);
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'TICKET_ALREADY_CLOSED') setReplyError(t('support.ticketClosed'));
      else if (code === 'ALREADY_ESCALATED') setReplyError(t('support.alreadyEscalated'));
      else if (code === 'ADMIN_FORBIDDEN') setReplyError(t('support.replyForbidden'));
      else setReplyError(t('support.actionFailed'));
    } finally { setSaving(false); }
  };

  const handleAssign = async () => {
    if (!assignTarget) return;
    setAssigning(true);
    setAssignError('');
    try {
      await adminApi.patch(`/support/${assignTarget.id}/assign`, { agentId: assignTo ? parseInt(assignTo, 10) : null });
      const newAgent = agents.find((a) => String(a.id) === assignTo) ?? null;
      if (selected?.id === assignTarget.id) {
        setSelected((prev) => prev ? {
          ...prev,
          assignedTo: assignTo ? parseInt(assignTo, 10) : null,
          assignedAt: assignTo ? new Date().toISOString() : null,
          status: assignTo ? 'IN_PROGRESS' : 'OPEN',
          assignedAgent: newAgent ? { fullName: newAgent.fullName, email: newAgent.email } : null,
        } : null);
      }
      setAssignTarget(null); setAssignTo('');
      void load(page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery);
    } catch {
      setAssignError(t('support.actionFailed'));
    } finally { setAssigning(false); }
  };

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0 || !bulkAgentId) return;
    setBulkAssigning(true);
    setBulkError('');
    try {
      await adminApi.post('/support/bulk-assign', { ticketIds: [...selectedIds], agentId: parseInt(bulkAgentId, 10) });
      setSelectedIds(new Set()); setBulkAgentId('');
      void load(page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery);
    } catch {
      setBulkError(t('support.actionFailed'));
    } finally { setBulkAssigning(false); }
  };

  const executeBulkStatus = async (status: 'RESOLVED' | 'CLOSED') => {
    if (selectedIds.size === 0) return;
    setBulkStatusing(true);
    setBulkError('');
    setBulkConfirm(null);
    try {
      await adminApi.post('/support/bulk-status', { ticketIds: [...selectedIds], status });
      setSelectedIds(new Set());
      void load(page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery);
    } catch {
      setBulkError(t('support.actionFailed'));
    } finally { setBulkStatusing(false); }
  };

  const handleAddQuickReply = async () => {
    if (!newQRTitle.trim() || !newQRContent.trim()) return;
    setSavingQR(true);
    setQrError('');
    try {
      await adminApi.post('/support/quick-replies', { title: newQRTitle.trim(), content: newQRContent.trim() });
      setNewQRTitle(''); setNewQRContent('');
      loadQuickReplies();
    } catch {
      setQrError(t('support.actionFailed'));
    } finally { setSavingQR(false); }
  };

  const handleDeleteQuickReply = async (id: number) => {
    setDeletingQRId(id);
  };

  const confirmDeleteQuickReply = async (id: number) => {
    await adminApi.delete(`/support/quick-replies/${id}`).catch(() => null);
    setDeletingQRId(null);
    loadQuickReplies();
  };

  const startEditQuickReply = (qr: QuickReply) => {
    setEditingQRId(qr.id);
    setEditQRTitle(qr.title);
    setEditQRContent(qr.content);
  };

  const cancelEditQuickReply = () => {
    setEditingQRId(null);
    setEditQRTitle('');
    setEditQRContent('');
  };

  const handleUpdateQuickReply = async () => {
    if (!editingQRId || !editQRTitle.trim() || !editQRContent.trim()) return;
    setSavingEditQR(true);
    try {
      await adminApi.patch(`/support/quick-replies/${editingQRId}`, { title: editQRTitle.trim(), content: editQRContent.trim() });
      cancelEditQuickReply();
      loadQuickReplies();
    } catch { /* silent */ }
    finally { setSavingEditQR(false); }
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
      void load(page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery);
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'NO_MANAGER_ASSIGNED') setEscalateError(t('support.escalateNoManager'));
      else if (code === 'ALREADY_ESCALATED') setEscalateError(t('support.alreadyEscalated'));
      else setEscalateError(t('support.actionFailed'));
    } finally {
      setEscalating(false);
    }
  };

  /* ── Abuse report ── */
  const loadAbuseReports = useCallback(async (p = 1, f = abuseFilter) => {
    setAbuseLoading(true);
    try {
      const params: Record<string, string> = { page: String(p) };
      if (f) params.status = f;
      const r = await adminApi.get('/support/abuse-reports', { params });
      setAbuseReports(r.data.data.reports ?? []);
      setAbuseTotal(r.data.data.total ?? 0);
    } catch { setAbuseReports([]); }
    finally { setAbuseLoading(false); }
  }, [abuseFilter]);

  useEffect(() => {
    if (view === 'abuse' && managerMode) {
      setAbusePage(1);
      void loadAbuseReports(1, abuseFilter);
    }
  }, [view]); // eslint-disable-line

  const handleReportAbuse = async () => {
    if (!reportTarget || !reportReason.trim()) return;
    setReporting(true);
    setReportError('');
    try {
      await adminApi.post(`/support/${reportTarget.id}/report-abuse`, { reason: reportReason.trim() });
      setReportSuccess(true);
      setTimeout(() => { setReportTarget(null); setReportReason(''); setReportSuccess(false); }, 2000);
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'ALREADY_REPORTED') setReportError(t('support.alreadyReported'));
      else setReportError(t('support.actionFailed'));
    } finally { setReporting(false); }
  };

  const handleResolveAbuse = async () => {
    if (!resolveTarget) return;
    setResolving(true);
    setResolveError('');
    try {
      await adminApi.patch(`/support/abuse-reports/${resolveTarget.id}/resolve`, {
        action: resolveAction,
        ...(resolveNote.trim() ? { reviewNote: resolveNote.trim() } : {}),
      });
      setResolveTarget(null);
      setResolveNote('');
      void loadAbuseReports(abusePage, abuseFilter);
    } catch { setResolveError(t('support.actionFailed')); }
    finally { setResolving(false); }
  };

  const applyFilter = (s: string, pr: string, a: string, srt: string) => {
    skipNext.current = true;
    setPage(1);
    void load(1, s, pr, a, srt, searchQuery);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      skipNext.current = true;
      setPage(1);
      void load(1, statusFilter, priorityFilter, agentFilter, sortOrder, value);
    }, 400);
  };

  /* ─── RENDER ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center shrink-0">
            <Inbox size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{t('support.title')}</h1>
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-400">{total}</span> {t('support.tickets')}
              {selectedIds.size > 0 && (
                <span className="ms-2 text-blue-400 font-medium">· {selectedIds.size} {t('support.ticketsSelected')}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex gap-0.5 p-0.5 bg-white/[0.04] border border-white/[0.06] rounded-lg">
            {([
              { key: 'tickets', label: t('support.ticketsView'), icon: <Inbox size={12} /> },
              ...(managerMode ? [{ key: 'team', label: t('support.teamView'), icon: <Users size={12} /> }] : []),
              ...(managerMode ? [{ key: 'abuse', label: t('support.abuseReports'), icon: <ShieldAlert size={12} /> }] : []),
            ] as { key: 'tickets' | 'team' | 'abuse'; label: string; icon: ReactNode }[]).map((item) => (
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/25 text-violet-400 hover:bg-violet-500/10 text-xs font-medium transition-all"
            >
              <Zap size={12} /> {t('support.quickReplies')}
            </button>
          )}
          <button
            onClick={() => void load(page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery)}
            aria-label="Refresh tickets"
            className="p-2 rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── My Performance (agent only) ── */}
      {!managerMode && myStats && view === 'tickets' && (
        <div className="rounded-xl border border-white/[0.07] bg-[#111118] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05]">
            <TrendingUp size={13} className="text-blue-400" />
            <h2 className="text-xs font-semibold text-white">{t('support.myPerformance')}</h2>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-px bg-white/[0.04]">
            <StatCard label={t('support.totalTickets')} value={myStats.total} color="text-white" icon={<Inbox size={11} />} />
            <StatCard label={t('support.activeTickets')} value={myStats.active} color={myStats.active > 5 ? 'text-red-400' : myStats.active > 0 ? 'text-amber-400' : 'text-emerald-400'} icon={<Clock size={11} />} />
            <StatCard label={t('support.resolved')} value={myStats.resolved} color="text-emerald-400" icon={<CheckSquare size={11} />} />
            <StatCard label={t('support.resolveRate')} value={myStats.total > 0 ? `${Math.round((myStats.resolved / myStats.total) * 100)}%` : '—'} color={resolveColor(myStats.total > 0 ? Math.round((myStats.resolved / myStats.total) * 100) : 0)} icon={<TrendingUp size={11} />} />
            <StatCard label={t('support.avgResponse')} value={myStats.avgResponseHours !== null ? `${myStats.avgResponseHours}h` : '—'} color={responseColor(myStats.avgResponseHours)} icon={<ArrowUpDown size={11} />} />
            <StatCard label={t('support.rating')} value={myStats.avgRating ? `${fmt(myStats.avgRating)}★` : '—'} color="text-amber-400" icon={<Star size={11} />} />
          </div>
        </div>
      )}

      {/* ════ TICKETS VIEW ════ */}
      {view === 'tickets' && (
        <>
          {/* ── Filters ── */}
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-xl bg-[#111118] border border-white/[0.06]">
            <Filter size={12} className="text-slate-600 shrink-0" />

            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('support.searchPlaceholder')}
              className="px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500/40 w-44 placeholder-slate-600"
            />

            <select
              value={statusFilter}
              onChange={(e) => { setStatus(e.target.value); applyFilter(e.target.value, priorityFilter, agentFilter, sortOrder); }}
              className="px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-300 focus:outline-none"
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
              className="px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-300 focus:outline-none"
            >
              <option value="">{t('support.priorityFilter')}</option>
              <option value="URGENT">{t('support.priorityUrgent')}</option>
              <option value="HIGH">{t('support.priorityHigh')}</option>
              <option value="NORMAL">{t('support.priorityNormal')}</option>
              <option value="LOW">{t('support.priorityLow')}</option>
            </select>

            {managerMode && (
              <select
                value={agentFilter}
                onChange={(e) => { setAgent(e.target.value); applyFilter(statusFilter, priorityFilter, e.target.value, sortOrder); }}
                className="px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-300 focus:outline-none"
              >
                <option value="">{t('support.allAgents')}</option>
                <option value="unassigned">{t('support.unassigned')}</option>
                {agents.map((a) => <option key={a.id} value={String(a.id)}>{a.fullName || a.email}</option>)}
              </select>
            )}

            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white/[0.04] border border-white/[0.07] rounded-lg">
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

          {/* ── Split panel ── */}
          <div className={`grid gap-4 ${selected ? 'grid-cols-1 lg:grid-cols-[1fr_440px]' : 'grid-cols-1'}`}>

            {/* Left: Ticket list */}
            <div className="space-y-1.5">
              {loading && (
                <div className="flex items-center justify-center py-16 text-slate-600 text-sm">{t('common.loading')}</div>
              )}
              {!loading && tickets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                    <Inbox size={20} className="text-slate-700" />
                  </div>
                  <p className="text-sm text-slate-600">{t('support.noTickets')}</p>
                </div>
              )}
              {tickets.map((tk) => (
                <button
                  key={tk.id}
                  onClick={() => { setSelected(tk); setReply(tk.reply ?? ''); setNewStatus('RESOLVED'); }}
                  className={`w-full text-start flex items-stretch gap-0 rounded-xl border transition-all overflow-hidden group ${
                    selected?.id === tk.id
                      ? 'border-blue-500/35 bg-blue-500/[0.04]'
                      : 'border-white/[0.06] bg-[#111118] hover:border-white/[0.12] hover:bg-white/[0.015]'
                  }`}
                >
                  {/* Status bar */}
                  <div className={`w-1 shrink-0 ${STATUS_BAR[tk.status] ?? 'bg-slate-600'}`} />

                  <div className="flex-1 px-3.5 py-3 min-w-0">
                    <div className="flex items-start gap-2.5">
                      {/* User avatar */}
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
                            <p className="text-[11px] text-slate-500 truncate">
                              {tk.user?.fullName ?? tk.user?.username ?? tk.user?.email ?? '—'}
                              <span className="text-slate-700"> · </span>
                              {tk.message}
                            </p>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <span className="text-[10px] text-slate-600 whitespace-nowrap">{timeAgo(tk.createdAt, i18n.language)}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[tk.priority] ?? 'bg-slate-600'}`} title={tk.priority} />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <Badge label={tk.status} />
                          <span className={`text-[10px] font-medium ${PRIORITY_TEXT[tk.priority] ?? 'text-slate-500'}`}>
                            {PRIORITY_KEY[tk.priority] ? t(PRIORITY_KEY[tk.priority]) : tk.priority}
                          </span>
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

            {/* ── Right: Ticket detail panel ── */}
            {selected && (
              <div
                className="lg:sticky lg:top-4 self-start rounded-xl border border-white/[0.08] bg-[#111118] overflow-hidden flex flex-col"
                style={{ maxHeight: 'calc(100vh - 100px)' }}
              >
                {/* Panel header */}
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
                    onClick={() => setSelected(null)}
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
                  {/* Original message */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] text-slate-600 font-medium uppercase tracking-wide">{t('support.originalMessage')}</span>
                      <div className="flex-1 h-px bg-white/[0.04]" />
                      <span className="text-[10px] text-slate-600">{timeAgo(selected.createdAt, i18n.language)}</span>
                    </div>
                    <div className="rounded-xl rounded-ss-sm bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
                    </div>
                  </div>

                  {/* Previous reply */}
                  {selected.reply && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="flex-1 h-px bg-white/[0.04]" />
                        <span className="text-[10px] text-emerald-500/70 font-medium uppercase tracking-wide">{t('support.previousReply')}</span>
                        {selected.repliedAt && (
                          <span className="text-[10px] text-slate-600">{timeAgo(selected.repliedAt, i18n.language)}</span>
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

                  {/* Escalation note */}
                  {selected.escalatedAt && managerMode && (
                    <div className="rounded-xl bg-orange-500/[0.05] border border-orange-500/20 px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ArrowUpCircle size={10} className="text-orange-400" />
                        <span className="text-[10px] text-orange-400 font-medium">{t('support.escalatedBadge')}</span>
                        <span className="ms-auto text-[10px] text-slate-600">{timeAgo(selected.escalatedAt, i18n.language)}</span>
                      </div>
                      {selected.escalationNote && (
                        <p className="text-xs text-slate-400 leading-relaxed">{selected.escalationNote}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions + Reply — sticky bottom */}
                <div className="border-t border-white/[0.06] px-4 py-3 space-y-2.5 shrink-0 bg-[#111118]">
                  {/* Assign / Escalate / Report */}
                  {(canAssign || canEscalate) && (
                    <div className="flex gap-2">
                      {canAssign && (
                        <button
                          onClick={() => { setAssignTarget(selected); setAssignTo(selected.assignedTo ? String(selected.assignedTo) : ''); }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-white/[0.08] text-slate-400 hover:text-blue-400 hover:border-blue-500/25 hover:bg-blue-500/[0.06] transition-all"
                        >
                          <UserCheck size={12} /> {t('support.assign')}
                        </button>
                      )}
                      {canEscalate && selected.assignedTo === currentAdmin?.id && !selected.escalatedAt &&
                       (selected.status === 'OPEN' || selected.status === 'IN_PROGRESS') && (
                        <button
                          onClick={() => { setEscalateTarget(selected); setEscalateNote(''); setEscalateError(''); }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-orange-500/20 text-orange-400 hover:bg-orange-500/10 transition-all"
                        >
                          <ArrowUpCircle size={12} /> {t('support.escalate')}
                        </button>
                      )}
                      {canEscalate && selected.escalatedAt && (
                        <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-orange-500/15 bg-orange-500/[0.05] text-orange-400">
                          <ArrowUpCircle size={12} /> {t('support.escalated')} · {timeAgo(selected.escalatedAt, i18n.language)}
                        </div>
                      )}
                      {canEscalate && selected.assignedTo === currentAdmin?.id && (
                        <button
                          onClick={() => { setReportTarget(selected); setReportReason(''); setReportError(''); setReportSuccess(false); }}
                          className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
                          title={t('support.reportAbuse')}
                        >
                          <Flag size={12} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Reply form */}
                  {canReply && (
                    selected.status === 'RESOLVED' || selected.status === 'CLOSED' ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-xs text-slate-600">
                        <X size={11} className="shrink-0" />
                        {t('support.ticketClosed')}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <textarea
                            value={reply}
                            onChange={(e) => { setReply(e.target.value); if (replyError) setReplyError(''); }}
                            rows={3}
                            maxLength={5000}
                            placeholder={t('support.yourReply')}
                            className="w-full px-3 py-2.5 pb-9 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-emerald-500/40 resize-none placeholder-slate-700 leading-relaxed"
                          />
                          <div className="absolute bottom-2 start-2 end-2 flex items-center justify-between">
                            <div ref={qrDropdownRef} className="relative">
                              <button
                                type="button"
                                onClick={() => setShowQRDropdown((v) => !v)}
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
                                        onClick={() => { setReply(qr.content); setShowQRDropdown(false); }}
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
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="flex-1 px-2 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none"
                          >
                            <option value="IN_PROGRESS">{t('support.inProgress')}</option>
                            <option value="RESOLVED">{t('support.resolved')}</option>
                            <option value="CLOSED">{t('support.closed')}</option>
                          </select>
                          <button
                            onClick={() => void handleReply()}
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
            )}
          </div>
        </>
      )}

      {/* ════ TEAM VIEW ════ */}
      {view === 'team' && managerMode && (
        <div className="space-y-4">

          {/* Breadcrumb */}
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

          {/* Manager cards */}
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

          {/* Agent cards */}
          {!statsLoading && (!isSuperAdmin || selectedManager) && (
            <>
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 bg-[#12121f] border border-blue-500/25 rounded-2xl px-5 py-3 shadow-2xl shadow-black/50 backdrop-blur-sm">
          {bulkConfirm ? (
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <span className="text-sm text-slate-300">
                {bulkConfirm === 'RESOLVED' ? t('support.bulkResolve') : t('support.bulkClose')} {selectedIds.size} {t('support.tickets')}?
              </span>
              <button
                onClick={() => void executeBulkStatus(bulkConfirm)}
                disabled={bulkStatusing}
                className={`px-4 py-1.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-all ${
                  bulkConfirm === 'RESOLVED' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-600 hover:bg-slate-500'
                }`}
              >
                {bulkStatusing ? t('common.saving') : t('common.confirm')}
              </button>
              <button
                onClick={() => setBulkConfirm(null)}
                className="px-4 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap justify-center">
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
                onClick={() => setBulkConfirm('RESOLVED')}
                disabled={bulkStatusing}
                className="px-4 py-1.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50 transition-all"
              >
                {t('support.bulkResolve')}
              </button>
              <button
                onClick={() => setBulkConfirm('CLOSED')}
                disabled={bulkStatusing}
                className="px-4 py-1.5 text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 transition-all"
              >
                {t('support.bulkClose')}
              </button>
              <button
                onClick={() => { setSelectedIds(new Set()); setBulkError(''); setBulkConfirm(null); }}
                aria-label="Clear selection"
                className="text-xs text-slate-600 hover:text-slate-300 transition-colors"
              >✕</button>
            </div>
          )}
          {bulkError && (
            <p className="text-[11px] text-red-400">{bulkError}</p>
          )}
        </div>
      )}

      {/* ════ ABUSE REPORTS VIEW ════ */}
      {view === 'abuse' && managerMode && (
        <div className="space-y-4">
          {/* Header + filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={14} className="text-red-400" />
              <h2 className="text-sm font-semibold text-white">{t('support.abuseReports')}</h2>
              {abuseTotal > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/20">{abuseTotal}</span>
              )}
            </div>
            <div className="flex gap-1 p-0.5 bg-white/[0.04] border border-white/[0.06] rounded-lg ms-auto">
              {(['PENDING', ''] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setAbuseFilter(f); void loadAbuseReports(1, f); setAbusePage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    abuseFilter === f ? 'bg-white/[0.1] text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {f === 'PENDING' ? t('support.abuseReportsPending') : t('support.abuseReportsAll')}
                </button>
              ))}
            </div>
          </div>

          {abuseLoading && (
            <div className="flex items-center justify-center py-16 text-slate-600 text-sm">{t('common.loading')}</div>
          )}

          {!abuseLoading && abuseReports.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                <ShieldCheck size={20} className="text-slate-700" />
              </div>
              <p className="text-sm text-slate-600">{t('support.noAbuseReports')}</p>
            </div>
          )}

          <div className="space-y-2">
            {abuseReports.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/[0.07] bg-[#111118] overflow-hidden">
                <div className="px-4 pt-3.5 pb-3 flex items-start gap-3">
                  {/* Status indicator */}
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    r.status === 'PENDING' ? 'bg-amber-400' : r.status === 'WARNED' ? 'bg-red-400' : 'bg-slate-600'
                  }`} />

                  <div className="flex-1 min-w-0">
                    {/* Ticket + user */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{r.ticket.subject}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-slate-500">
                            {r.user.fullName ?? r.user.username ?? r.user.email ?? `#${r.user.id}`}
                          </span>
                          {r.user.warningCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
                              <AlertTriangle size={8} /> {r.user.warningCount} {t('support.warningCount')}
                            </span>
                          )}
                          {r.user.isSuspended && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/15 flex items-center gap-0.5">
                              <ShieldOff size={8} /> {t('support.suspended')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-end">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                          r.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : r.status === 'WARNED' ? 'bg-red-500/10 text-red-400 border-red-500/15'
                          : 'bg-slate-700/40 text-slate-500 border-slate-700/60'
                        }`}>
                          {t(`support.abuseStatus${r.status.charAt(0) + r.status.slice(1).toLowerCase()}`)}
                        </span>
                        <p className="text-[9px] text-slate-600 mt-1">{timeAgo(r.createdAt, i18n.language)}</p>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-2 mb-2">
                      <p className="text-[11px] text-slate-400 leading-relaxed">{r.reason}</p>
                    </div>

                    {/* Reporter + review note */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] text-slate-600">
                        {t('support.reportedBy')}: <span className="text-slate-500">{r.reporter.fullName || r.reporter.email}</span>
                      </span>
                      {r.reviewNote && (
                        <span className="text-[10px] text-slate-600 italic">"{r.reviewNote}"</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {r.status === 'PENDING' && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => { setResolveTarget(r); setResolveAction('warn'); setResolveNote(''); setResolveError(''); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/25 transition-all whitespace-nowrap"
                      >
                        <AlertTriangle size={9} /> {t('support.warnUser')}
                      </button>
                      <button
                        onClick={() => { setResolveTarget(r); setResolveAction('dismiss'); setResolveNote(''); setResolveError(''); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-400 hover:text-slate-200 transition-all whitespace-nowrap"
                      >
                        <X size={9} /> {t('support.dismissReport')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {abuseTotal > 20 && (
            <Pagination page={abusePage} totalPages={Math.ceil(abuseTotal / 20)} total={abuseTotal} limit={20} onChange={(p) => {
              setAbusePage(p);
              void loadAbuseReports(p, abuseFilter);
            }} />
          )}
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
            <div className="flex items-start gap-2.5 rounded-xl bg-orange-500/[0.05] border border-orange-500/20 px-3 py-3">
              <ArrowUpCircle size={14} className="text-orange-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">{t('support.escalateDesc')}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
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
                className="w-full px-3 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-orange-500/50 resize-none placeholder-slate-600"
              />
            </div>
            {escalateError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{escalateError}</p>
            )}
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => { setEscalateTarget(null); setEscalateNote(''); setEscalateError(''); }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
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
      <Modal open={!!assignTarget} onClose={() => { setAssignTarget(null); setAssignError(''); }} title={t('support.assignTicket')}>
        {assignTarget && (
          <div className="space-y-4">
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
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
                className="w-full px-3 py-2.5 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-blue-500/50"
              >
                <option value="">{t('support.unassignedOption')}</option>
                {agents.map((a) => <option key={a.id} value={String(a.id)}>{a.fullName || a.email}</option>)}
              </select>
            </div>
            {assignTo && (
              <p className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">{t('support.assignNote')}</p>
            )}
            {assignError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{assignError}</p>
            )}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => { setAssignTarget(null); setAssignError(''); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">{t('common.cancel')}</button>
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

      {/* ── Report Abuse Modal ── */}
      <Modal
        open={!!reportTarget}
        onClose={() => { setReportTarget(null); setReportReason(''); setReportError(''); setReportSuccess(false); }}
        title={t('support.reportAbuseTitle')}
      >
        {reportTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl bg-red-500/[0.05] border border-red-500/20 px-3 py-3">
              <Flag size={13} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">{t('support.reportAbuseHint')}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
              <p className="text-sm font-semibold text-white">{reportTarget.subject}</p>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{reportTarget.message}</p>
            </div>
            {reportSuccess ? (
              <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <ShieldCheck size={13} /> {t('support.reportAbuseSuccess')}
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">{t('support.reportAbuseReason')}</label>
                  <textarea
                    value={reportReason}
                    onChange={(e) => { setReportReason(e.target.value); if (reportError) setReportError(''); }}
                    rows={4}
                    maxLength={1000}
                    placeholder={t('support.reportAbuseReasonPlaceholder')}
                    className="w-full px-3 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-red-500/50 resize-none placeholder-slate-600"
                  />
                </div>
                {reportError && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{reportError}</p>
                )}
                <div className="flex gap-3 justify-end pt-1">
                  <button
                    onClick={() => { setReportTarget(null); setReportReason(''); setReportError(''); }}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={() => void handleReportAbuse()}
                    disabled={reporting || reportReason.trim().length < 5}
                    className="px-4 py-2 text-sm font-semibold bg-red-500 hover:bg-red-400 text-white rounded-lg disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    <Flag size={13} />
                    {reporting ? t('common.sending') : t('support.reportAbuseSubmit')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* ── Resolve Abuse Report Modal ── */}
      <Modal
        open={!!resolveTarget}
        onClose={() => { setResolveTarget(null); setResolveNote(''); setResolveError(''); }}
        title={resolveAction === 'warn' ? t('support.warnUser') : t('support.dismissReport')}
      >
        {resolveTarget && (
          <div className="space-y-4">
            <div className={`flex items-start gap-2.5 rounded-xl px-3 py-3 border ${
              resolveAction === 'warn'
                ? 'bg-amber-500/[0.05] border-amber-500/20'
                : 'bg-white/[0.03] border-white/[0.06]'
            }`}>
              {resolveAction === 'warn'
                ? <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                : <X size={13} className="text-slate-500 shrink-0 mt-0.5" />
              }
              <p className="text-xs text-slate-400 leading-relaxed">
                {resolveAction === 'warn' ? t('support.confirmWarn') : t('support.confirmDismiss')}
              </p>
            </div>

            {/* Report summary */}
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06] space-y-1.5">
              <p className="text-xs font-semibold text-white">{resolveTarget.ticket.subject}</p>
              <p className="text-[11px] text-slate-500 line-clamp-2">{resolveTarget.reason}</p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[10px] text-slate-600">
                  {t('support.reportedBy')}: <span className="text-slate-500">{resolveTarget.reporter.fullName || resolveTarget.reporter.email}</span>
                </span>
                {resolveTarget.user.warningCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
                    <AlertTriangle size={8} /> {resolveTarget.user.warningCount} {t('support.warningCount')}
                  </span>
                )}
              </div>
            </div>

            {/* Toggle action */}
            <div className="flex gap-2">
              <button
                onClick={() => setResolveAction('warn')}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                  resolveAction === 'warn'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'border-white/[0.07] text-slate-500 hover:text-slate-300'
                }`}
              >
                {t('support.warnUser')}
              </button>
              <button
                onClick={() => setResolveAction('dismiss')}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                  resolveAction === 'dismiss'
                    ? 'bg-white/[0.08] border-white/[0.15] text-slate-300'
                    : 'border-white/[0.07] text-slate-500 hover:text-slate-300'
                }`}
              >
                {t('support.dismissReport')}
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('support.reviewNote')}</label>
              <textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={t('support.reviewNotePlaceholder')}
                className="w-full px-3 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-blue-500/50 resize-none placeholder-slate-600"
              />
            </div>

            {resolveError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{resolveError}</p>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => { setResolveTarget(null); setResolveNote(''); setResolveError(''); }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => void handleResolveAbuse()}
                disabled={resolving}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-all flex items-center gap-1.5 ${
                  resolveAction === 'warn' ? 'bg-amber-500 hover:bg-amber-400' : 'bg-slate-600 hover:bg-slate-500'
                }`}
              >
                {resolving ? t('common.saving') : resolveAction === 'warn' ? t('support.warnUser') : t('support.dismissReport')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Manage Quick Replies Modal ── */}
      {managerMode && (
        <Modal
          open={showManageQR}
          onClose={() => { setShowManageQR(false); cancelEditQuickReply(); }}
          title={t('support.manageQuickReplies')}
        >
          <div className="space-y-4">
            {/* List */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {quickReplies.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">{t('support.noQuickReplies')}</p>
              )}
              {quickReplies.map((qr) => (
                <div key={qr.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
                  {editingQRId === qr.id ? (
                    <div className="space-y-2">
                      <input
                        value={editQRTitle}
                        onChange={(e) => setEditQRTitle(e.target.value)}
                        maxLength={100}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-violet-500/50"
                      />
                      <textarea
                        value={editQRContent}
                        onChange={(e) => setEditQRContent(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-violet-500/50 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleUpdateQuickReply()}
                          disabled={savingEditQR || !editQRTitle.trim() || !editQRContent.trim()}
                          className="flex-1 text-[10px] px-2 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-colors"
                        >
                          {savingEditQR ? t('common.saving') : t('support.saveQuickReply')}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditQuickReply}
                          className="text-[10px] px-2 py-1.5 rounded-lg bg-white/[0.05] text-slate-400 hover:bg-white/[0.1] transition-colors"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white">{qr.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{qr.content}</p>
                      </div>
                      {deletingQRId === qr.id ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => void confirmDeleteQuickReply(qr.id)}
                            className="text-[10px] px-2 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                          >
                            {t('common.confirm')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingQRId(null)}
                            className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.05] text-slate-400 hover:bg-white/[0.1] transition-colors"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          <button
                            type="button"
                            onClick={() => startEditQuickReply(qr)}
                            className="p-1 rounded-md text-slate-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteQuickReply(qr.id)}
                            className="p-1 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add new */}
            <div className="border-t border-white/[0.06] pt-4 space-y-2">
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-2">{t('support.addQuickReply')}</p>
              <input
                value={newQRTitle}
                onChange={(e) => setNewQRTitle(e.target.value)}
                placeholder={t('support.quickReplyTitle')}
                maxLength={100}
                className="w-full px-3 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-violet-500/50 placeholder-slate-600"
              />
              <textarea
                value={newQRContent}
                onChange={(e) => setNewQRContent(e.target.value)}
                placeholder={t('support.quickReplyContent')}
                rows={3}
                maxLength={2000}
                className="w-full px-3 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-violet-500/50 resize-none placeholder-slate-600"
              />
              {qrError && (
                <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">{qrError}</p>
              )}
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