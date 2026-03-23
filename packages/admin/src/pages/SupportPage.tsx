import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw, Inbox, ArrowUpDown, CheckSquare, Search,
  Users, ShieldAlert, Zap, ArrowUpCircle, Flag, AlertTriangle, X, Plus, Trash2, Pencil, ShieldCheck,
  TrendingUp, Star, Clock, SlidersHorizontal,
} from 'lucide-react';

import { adminApi } from '../lib/adminApi';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { Badge } from '../components/Badge';
import { useAdminStore } from '../store/adminAuthStore';

import type { Ticket, Agent, QuickReply, AgentStat, ManagerStat, MyStats, AbuseReport } from '../components/support/types';
import { isOverdue, timeAgo, userInitial, STATUS_BAR, PRIORITY_DOT, PRIORITY_TEXT, PRIORITY_KEY, fmt, resolveColor, responseColor } from '../components/support/helpers';
import { StatCard } from '../components/support/StatCard';
import { TicketListItem } from '../components/support/TicketListItem';
import { TicketDetailPanel } from '../components/support/TicketDetailPanel';
import { BulkActionBar } from '../components/support/BulkActionBar';
import { TeamView } from '../components/support/TeamView';
import { AbuseView } from '../components/support/AbuseView';

export default function SupportPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-u-nu-latn' : 'en-GB';
  const currentAdmin = useAdminStore((s) => s.admin);
  const isSuperAdmin = currentAdmin?.role === 'SUPER_ADMIN';

  const hasManage = isSuperAdmin || !!(currentAdmin?.permissions?.includes('support.manage'));
  const canReply = isSuperAdmin || currentAdmin?.permissions?.includes('support.reply') || hasManage;
  const canAssign = isSuperAdmin || currentAdmin?.permissions?.includes('support.assign') || hasManage;
  const managerMode = hasManage;
  const canEscalate = isSuperAdmin || (!!(currentAdmin?.permissions?.includes('support.reply')) && !hasManage);

  const [view, setView] = useState<'tickets' | 'team' | 'abuse'>('tickets');
  const [selectedManager, setSelectedManager] = useState<ManagerStat | null>(null);

  /* Ticket state */
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatus] = useState('');
  const [priorityFilter, setPrio] = useState('');
  const [agentFilter, setAgent] = useState('');
  const [sortOrder, setSort] = useState('oldest');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);

  /* Reply state */
  const [reply, setReply] = useState('');
  const [newStatus, setNewStatus] = useState('RESOLVED');
  const [saving, setSaving] = useState(false);
  const [replyError, setReplyError] = useState('');

  /* Assign state */
  const [assignTarget, setAssignTarget] = useState<Ticket | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);

  /* Escalate state */
  const [escalateTarget, setEscalateTarget] = useState<Ticket | null>(null);
  const [escalateNote, setEscalateNote] = useState('');
  const [escalateManagerId, setEscalateManagerId] = useState<string>('');
  const [escalating, setEscalating] = useState(false);
  const [escalateError, setEscalateError] = useState('');
  const [managers, setManagers] = useState<Agent[]>([]);

  /* Search */
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Bulk */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAgentId, setBulkAgentId] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkStatusing, setBulkStatusing] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkConfirm, setBulkConfirm] = useState<'RESOLVED' | 'CLOSED' | null>(null);

  /* Abuse report */
  const [reportTarget, setReportTarget] = useState<Ticket | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  /* Abuse reviews */
  const [abuseReports, setAbuseReports] = useState<AbuseReport[]>([]);
  const [abuseTotal, setAbuseTotal] = useState(0);
  const [abusePage, setAbusePage] = useState(1);
  const [abuseFilter, setAbuseFilter] = useState('PENDING');
  const [abuseLoading, setAbuseLoading] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<AbuseReport | null>(null);
  const [resolveAction, setResolveAction] = useState<'warn' | 'dismiss'>('warn');
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');

  /* Quick replies */
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQRDropdown, setShowQRDropdown] = useState(false);
  const [showManageQR, setShowManageQR] = useState(false);
  const [newQRTitle, setNewQRTitle] = useState('');
  const [newQRContent, setNewQRContent] = useState('');
  const [savingQR, setSavingQR] = useState(false);
  const [qrError, setQrError] = useState('');
  const [deletingQRId, setDeletingQRId] = useState<number | null>(null);
  const [editingQRId, setEditingQRId] = useState<number | null>(null);
  const [editQRTitle, setEditQRTitle] = useState('');
  const [editQRContent, setEditQRContent] = useState('');
  const [savingEditQR, setSavingEditQR] = useState(false);
  const qrDropdownRef = useRef<HTMLDivElement>(null);

  /* Support access settings */
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessPlans, setAccessPlans] = useState<string[]>(['pro', 'yearly', 'ultra', 'ultra_yearly']);
  const [savingAccess, setSavingAccess] = useState(false);
  const [accessSaveError, setAccessSaveError] = useState('');

  /* Team stats */
  const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
  const [managerStats, setManagerStats] = useState<ManagerStat[]>([]);
  const [globalUnassigned, setGlobalUnassigned] = useState(0);
  const [statsLoading, setStatsLoading] = useState(false);
  const [myStats, setMyStats] = useState<MyStats | null>(null);

  const skipNext = useRef(false);
  const currentParamsRef = useRef({ page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery });

  /* ── API calls ── */
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

  const loadQuickReplies = useCallback(() => {
    if (canReply) {
      adminApi.get('/support/quick-replies').then((r) => setQuickReplies(r.data.data ?? [])).catch(() => null);
    }
  }, [canReply]);

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

  /* ── Effects ── */
  useEffect(() => {
    currentParamsRef.current = { page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery };
  }, [page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery]);

  useEffect(() => { if (canAssign) { adminApi.get('/support/agents').then((r) => setAgents(r.data.data ?? [])).catch(() => null); } }, [canAssign]);
  useEffect(() => { if (canEscalate) { adminApi.get('/support/managers').then((r) => setManagers(r.data.data ?? [])).catch(() => null); } }, [canEscalate]);
  useEffect(() => { loadQuickReplies(); }, [loadQuickReplies]);

  useEffect(() => {
    if (!showQRDropdown) return;
    const handle = (e: MouseEvent) => {
      if (qrDropdownRef.current && !qrDropdownRef.current.contains(e.target as Node)) setShowQRDropdown(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showQRDropdown]);

  useEffect(() => { setReplyError(''); setShowQRDropdown(false); }, [selected?.id]);

  useEffect(() => {
    if (view !== 'tickets') return;
    const id = setInterval(() => {
      const p = currentParamsRef.current;
      void load(p.page, p.statusFilter, p.priorityFilter, p.agentFilter, p.sortOrder, p.searchQuery, true);
    }, 30_000);
    return () => clearInterval(id);
  }, [view, load]);

  useEffect(() => {
    if (!selected) return;
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [selected]);

  useEffect(() => () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); }, []);

  useEffect(() => {
    if (!managerMode && currentAdmin?.permissions?.includes('support.reply')) {
      adminApi.get('/support/my-stats').then((r) => setMyStats(r.data.data)).catch(() => null);
    }
  }, [managerMode, currentAdmin]);

  useEffect(() => {
    void load(1, '', '', '', sortOrder, '');
    if (isSuperAdmin) {
      adminApi.get('/support/settings').then((r) => setAccessPlans(r.data.data.allowedPlans ?? [])).catch(() => null);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return; }
    void load(page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery);
  }, [page]); // eslint-disable-line

  useEffect(() => {
    if (view === 'team') {
      if (isSuperAdmin && !selectedManager) void loadTeamStats();
      else if (isSuperAdmin && selectedManager) void loadTeamStats(selectedManager.manager.id);
      else void loadTeamStats();
    }
  }, [view, selectedManager]); // eslint-disable-line

  useEffect(() => {
    if (view === 'abuse' && managerMode) { setAbusePage(1); void loadAbuseReports(1, abuseFilter); }
  }, [view]); // eslint-disable-line

  /* ── Handlers ── */
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

  const handleReply = async () => {
    if (!selected || !reply.trim()) return;
    setSaving(true); setReplyError('');
    try {
      const res = await adminApi.patch(`/support/${selected.id}/reply`, { reply, status: newStatus });
      const patch = res.data.data as Ticket;
      const updated: Ticket = { ...patch, user: selected.user, assignedAgent: selected.assignedAgent };
      setSelected(updated);
      setTickets((prev) => prev.map((tk) => tk.id === updated.id ? updated : tk));
      setReply(''); setShowQRDropdown(false);
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
    setAssigning(true); setAssignError('');
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
    } catch { setAssignError(t('support.actionFailed')); }
    finally { setAssigning(false); }
  };

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0 || !bulkAgentId) return;
    setBulkAssigning(true); setBulkError('');
    try {
      await adminApi.post('/support/bulk-assign', { ticketIds: [...selectedIds], agentId: parseInt(bulkAgentId, 10) });
      setSelectedIds(new Set()); setBulkAgentId('');
      void load(page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery);
    } catch { setBulkError(t('support.actionFailed')); }
    finally { setBulkAssigning(false); }
  };

  const executeBulkStatus = async (status: 'RESOLVED' | 'CLOSED') => {
    if (selectedIds.size === 0) return;
    setBulkStatusing(true); setBulkError(''); setBulkConfirm(null);
    try {
      await adminApi.post('/support/bulk-status', { ticketIds: [...selectedIds], status });
      setSelectedIds(new Set());
      void load(page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery);
    } catch { setBulkError(t('support.actionFailed')); }
    finally { setBulkStatusing(false); }
  };

  const handleEscalate = async () => {
    if (!escalateTarget) return;
    setEscalating(true); setEscalateError('');
    try {
      await adminApi.post(`/support/${escalateTarget.id}/escalate`, {
        note: escalateNote,
        ...(escalateManagerId ? { managerId: parseInt(escalateManagerId, 10) } : {}),
      });
      setEscalateTarget(null); setEscalateNote(''); setEscalateManagerId(''); setSelected(null);
      void load(page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery);
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'NO_MANAGER_ASSIGNED') setEscalateError(t('support.escalateNoManager'));
      else if (code === 'ALREADY_ESCALATED') setEscalateError(t('support.alreadyEscalated'));
      else setEscalateError(t('support.actionFailed'));
    } finally { setEscalating(false); }
  };

  const handleReportAbuse = async () => {
    if (!reportTarget || !reportReason.trim()) return;
    setReporting(true); setReportError('');
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
    setResolving(true); setResolveError('');
    try {
      await adminApi.patch(`/support/abuse-reports/${resolveTarget.id}/resolve`, {
        action: resolveAction,
        ...(resolveNote.trim() ? { reviewNote: resolveNote.trim() } : {}),
      });
      setResolveTarget(null); setResolveNote('');
      void loadAbuseReports(abusePage, abuseFilter);
    } catch { setResolveError(t('support.actionFailed')); }
    finally { setResolving(false); }
  };

  const handleAddQuickReply = async () => {
    if (!newQRTitle.trim() || !newQRContent.trim()) return;
    setSavingQR(true); setQrError('');
    try {
      await adminApi.post('/support/quick-replies', { title: newQRTitle.trim(), content: newQRContent.trim() });
      setNewQRTitle(''); setNewQRContent('');
      loadQuickReplies();
    } catch { setQrError(t('support.actionFailed')); }
    finally { setSavingQR(false); }
  };

  const confirmDeleteQuickReply = async (id: number) => {
    await adminApi.delete(`/support/quick-replies/${id}`).catch(() => null);
    setDeletingQRId(null);
    loadQuickReplies();
  };

  const handleUpdateQuickReply = async () => {
    if (!editingQRId || !editQRTitle.trim() || !editQRContent.trim()) return;
    setSavingEditQR(true);
    try {
      await adminApi.patch(`/support/quick-replies/${editingQRId}`, { title: editQRTitle.trim(), content: editQRContent.trim() });
      setEditingQRId(null); setEditQRTitle(''); setEditQRContent('');
      loadQuickReplies();
    } catch { /* silent */ }
    finally { setSavingEditQR(false); }
  };

  const handleSaveAccessPlans = async () => {
    setAccessSaveError('');
    setSavingAccess(true);
    try {
      await adminApi.patch('/support/settings', { allowedPlans: accessPlans });
      setShowAccessModal(false);
    } catch {
      setAccessSaveError('فشل الحفظ — حاول تاني');
    } finally { setSavingAccess(false); }
  };

  const toggleAccessPlan = (group: 'free' | 'pro' | 'ultra') => {
    const groupPlans: Record<string, string[]> = {
      free:  ['free'],
      pro:   ['pro', 'yearly'],
      ultra: ['ultra', 'ultra_yearly'],
    };
    const plans = groupPlans[group];
    const allIn = plans.every((p) => accessPlans.includes(p));
    if (allIn) {
      setAccessPlans((prev) => prev.filter((p) => !plans.includes(p)));
    } else {
      setAccessPlans((prev) => [...new Set([...prev, ...plans])]);
    }
  };

  /* ─── RENDER ─────────────────────────────────────────────────── */

  const STATUS_TABS = [
    { value: '',            label: t('support.all'),        dot: 'bg-slate-500' },
    { value: 'OPEN',        label: t('support.open'),       dot: 'bg-blue-400' },
    { value: 'IN_PROGRESS', label: t('support.inProgress'), dot: 'bg-amber-400' },
    { value: 'RESOLVED',    label: t('support.resolved'),   dot: 'bg-emerald-400' },
    { value: 'CLOSED',      label: t('support.closed'),     dot: 'bg-slate-600' },
  ];

  return (
    <div className="space-y-0">

      {/* ── Top bar: title + actions ── */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">{t('support.title')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            <span className="font-semibold text-slate-400">{total.toLocaleString('en-US')}</span> {t('support.tickets')}
            {selectedIds.size > 0 && (
              <span className="ms-2 text-blue-400 font-medium">· {selectedIds.size.toLocaleString('en-US')} {t('support.ticketsSelected')}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {managerMode && (
            <button
              onClick={() => setShowManageQR(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/25 bg-violet-500/5 text-violet-400 hover:bg-violet-500/10 text-xs font-medium transition-all"
            >
              <Zap size={12} /> {t('support.quickReplies')}
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => setShowAccessModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/25 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 text-xs font-medium transition-all"
            >
              <ShieldCheck size={12} /> {t('support.planAccess')}
            </button>
          )}
          <button
            onClick={() => void load(page, statusFilter, priorityFilter, agentFilter, sortOrder, searchQuery)}
            aria-label="Refresh"
            className="p-2 rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── View tabs ── */}
      {managerMode && (
        <div className="flex border-b border-white/[0.07] mb-5">
          {([
            { key: 'tickets' as const, label: t('support.ticketsView'), icon: <Inbox size={14} /> },
            { key: 'team'    as const, label: t('support.teamView'),    icon: <Users size={14} /> },
            { key: 'abuse'   as const, label: t('support.abuseReports'), icon: <ShieldAlert size={14} /> },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-all ${
                view === tab.key
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/20'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── My Performance (agent only) ── */}
      {!managerMode && myStats && view === 'tickets' && (
        <div className="rounded-xl border border-white/[0.07] bg-[#111118] overflow-hidden mb-5">
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

      {/* ── Tickets View ── */}
      {view === 'tickets' && (
        <>
          {/* Status pills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {STATUS_TABS.map((s) => (
              <button
                key={s.value}
                onClick={() => { setStatus(s.value); applyFilter(s.value, priorityFilter, agentFilter, sortOrder); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  statusFilter === s.value
                    ? 'bg-blue-500/15 border-blue-500/35 text-blue-300'
                    : 'border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/[0.18]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === s.value ? 'bg-blue-400' : s.dot}`} />
                {s.label}
              </button>
            ))}
          </div>

          {/* Secondary filters */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t('support.searchPlaceholder')}
                className="w-full pl-8 pr-3 py-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500/40 placeholder-slate-600"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <SlidersHorizontal size={12} className="text-slate-600" />
              <select
                value={priorityFilter}
                onChange={(e) => { setPrio(e.target.value); applyFilter(statusFilter, e.target.value, agentFilter, sortOrder); }}
                className="px-2.5 py-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none"
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
                  className="px-2.5 py-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none"
                >
                  <option value="">{t('support.allAgents')}</option>
                  <option value="unassigned">{t('support.unassigned')}</option>
                  {agents.map((a) => <option key={a.id} value={String(a.id)}>{a.fullName || a.email}</option>)}
                </select>
              )}

              <div className="flex items-center gap-1 px-2.5 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg">
                <ArrowUpDown size={11} className="text-slate-500 shrink-0" />
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
            </div>

            {managerMode && selectedIds.size === 0 && (
              <div className="ms-auto flex items-center gap-1.5">
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
          <div className={`grid gap-4 ${selected ? 'grid-cols-1 lg:grid-cols-[1fr_440px]' : 'grid-cols-1'}`}>
            {/* Ticket list */}
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
                <TicketListItem
                  key={tk.id}
                  tk={tk}
                  isSelected={selected?.id === tk.id}
                  managerMode={managerMode}
                  isChecked={selectedIds.has(tk.id)}
                  locale={i18n.language}
                  t={t}
                  onSelect={() => { setSelected(tk); setReply(tk.reply ?? ''); setNewStatus('RESOLVED'); }}
                  onCheck={(checked) => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(tk.id); else next.delete(tk.id);
                      return next;
                    });
                  }}
                />
              ))}
              <div className="pt-2">
                <Pagination page={page} totalPages={Math.ceil(total / 50)} total={total} limit={50} onChange={(p) => {
                  skipNext.current = false;
                  setPage(p);
                }} />
              </div>
            </div>

            {/* Ticket detail panel */}
            {selected && (
              <TicketDetailPanel
                selected={selected}
                reply={reply}
                newStatus={newStatus}
                saving={saving}
                replyError={replyError}
                canReply={!!canReply}
                canAssign={canAssign}
                canEscalate={canEscalate}
                quickReplies={quickReplies}
                showQRDropdown={showQRDropdown}
                currentAdminId={currentAdmin?.id}
                locale={locale}
                t={t}
                onClose={() => setSelected(null)}
                onReplyChange={(v) => { setReply(v); if (replyError) setReplyError(''); }}
                onStatusChange={setNewStatus}
                onSendReply={() => void handleReply()}
                onAssignClick={() => { setAssignTarget(selected); setAssignTo(selected.assignedTo ? String(selected.assignedTo) : ''); }}
                onEscalateClick={() => { setEscalateTarget(selected); setEscalateNote(''); setEscalateError(''); }}
                onReportClick={() => { setReportTarget(selected); setReportReason(''); setReportError(''); setReportSuccess(false); }}
                onQRDropdownToggle={() => setShowQRDropdown((v) => !v)}
                onQRSelect={(content) => { setReply(content); setShowQRDropdown(false); }}
                qrDropdownRef={qrDropdownRef}
              />
            )}
          </div>
        </>
      )}

      {/* Team View */}
      {view === 'team' && managerMode && (
        <TeamView
          isSuperAdmin={isSuperAdmin}
          selectedManager={selectedManager}
          agentStats={agentStats}
          managerStats={managerStats}
          globalUnassigned={globalUnassigned}
          statsLoading={statsLoading}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          sortOrder={sortOrder}
          t={t}
          onManagerSelect={setSelectedManager}
          onManagerBack={() => setSelectedManager(null)}
          onViewAgentTickets={(agentId) => {
            setAgent(String(agentId));
            setView('tickets');
            applyFilter(statusFilter, priorityFilter, String(agentId), sortOrder);
          }}
        />
      )}

      {/* Bulk Action Bar */}
      {managerMode && (
        <BulkActionBar
          selectedIds={selectedIds}
          agents={agents}
          bulkAgentId={bulkAgentId}
          bulkAssigning={bulkAssigning}
          bulkStatusing={bulkStatusing}
          bulkError={bulkError}
          bulkConfirm={bulkConfirm}
          t={t}
          onAgentChange={setBulkAgentId}
          onBulkAssign={() => void handleBulkAssign()}
          onBulkConfirm={setBulkConfirm}
          onBulkExecute={(status) => void executeBulkStatus(status)}
          onCancelConfirm={() => setBulkConfirm(null)}
          onClearSelection={() => { setSelectedIds(new Set()); setBulkError(''); setBulkConfirm(null); }}
        />
      )}

      {/* Abuse View */}
      {view === 'abuse' && managerMode && (
        <AbuseView
          abuseReports={abuseReports}
          abuseTotal={abuseTotal}
          abusePage={abusePage}
          abuseFilter={abuseFilter}
          abuseLoading={abuseLoading}
          locale={i18n.language}
          t={t}
          onFilterChange={(f) => { setAbuseFilter(f); void loadAbuseReports(1, f); setAbusePage(1); }}
          onPageChange={(p) => { setAbusePage(p); void loadAbuseReports(p, abuseFilter); }}
          onWarn={(r) => { setResolveTarget(r); setResolveAction('warn'); setResolveNote(''); setResolveError(''); }}
          onDismiss={(r) => { setResolveTarget(r); setResolveAction('dismiss'); setResolveNote(''); setResolveError(''); }}
        />
      )}

      {/* Escalate Modal */}
      <Modal open={!!escalateTarget} onClose={() => { setEscalateTarget(null); setEscalateNote(''); setEscalateManagerId(''); setEscalateError(''); }} title={t('support.escalateTitle')}>
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
            {managers.length > 0 && (
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">{t('support.escalateTo')}</label>
                <select
                  value={escalateManagerId}
                  onChange={(e) => setEscalateManagerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-orange-500/50"
                >
                  <option value="">{t('support.escalateAutoManager')}</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.fullName || m.email}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('support.escalateNote')}</label>
              <textarea value={escalateNote} onChange={(e) => setEscalateNote(e.target.value)} rows={3} placeholder={t('support.escalateNotePlaceholder')} className="w-full px-3 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-orange-500/50 resize-none placeholder-slate-600" />
            </div>
            {escalateError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{escalateError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => { setEscalateTarget(null); setEscalateNote(''); setEscalateManagerId(''); setEscalateError(''); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">{t('common.cancel')}</button>
              <Button onClick={() => void handleEscalate()} loading={escalating} icon={<ArrowUpCircle size={13} />} className="bg-orange-500 hover:bg-orange-400 text-white border-transparent">
                {t('support.escalateConfirm')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Assign Modal */}
      <Modal open={!!assignTarget} onClose={() => { setAssignTarget(null); setAssignError(''); }} title={t('support.assignTicket')}>
        {assignTarget && (
          <div className="space-y-4">
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
              <p className="text-sm font-semibold text-white">{assignTarget.subject}</p>
              <p className="text-xs text-slate-500 mt-1">{assignTarget.user?.fullName ?? assignTarget.user?.email}</p>
              <div className="flex items-center gap-2 mt-2"><Badge label={assignTarget.status} /><Badge label={assignTarget.priority} /></div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('support.assignTo')}</label>
              <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-blue-500/50">
                <option value="">{t('support.unassignedOption')}</option>
                {agents.map((a) => <option key={a.id} value={String(a.id)}>{a.fullName || a.email}</option>)}
              </select>
            </div>
            {assignTo && <p className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">{t('support.assignNote')}</p>}
            {assignError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{assignError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => { setAssignTarget(null); setAssignError(''); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">{t('common.cancel')}</button>
              <Button onClick={() => void handleAssign()} loading={assigning}>
                {t('support.confirmAssign')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Report Abuse Modal */}
      <Modal open={!!reportTarget} onClose={() => { setReportTarget(null); setReportReason(''); setReportError(''); setReportSuccess(false); }} title={t('support.reportAbuseTitle')}>
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
                  <textarea value={reportReason} onChange={(e) => { setReportReason(e.target.value); if (reportError) setReportError(''); }} rows={4} maxLength={1000} placeholder={t('support.reportAbuseReasonPlaceholder')} className="w-full px-3 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-red-500/50 resize-none placeholder-slate-600" />
                </div>
                {reportError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{reportError}</p>}
                <div className="flex gap-3 justify-end pt-1">
                  <button onClick={() => { setReportTarget(null); setReportReason(''); setReportError(''); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">{t('common.cancel')}</button>
                  <Button onClick={() => void handleReportAbuse()} loading={reporting} disabled={reporting || reportReason.trim().length < 5} variant="danger" icon={<Flag size={13} />}>
                    {t('support.reportAbuseSubmit')}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Resolve Abuse Report Modal */}
      <Modal open={!!resolveTarget} onClose={() => { setResolveTarget(null); setResolveNote(''); setResolveError(''); }} title={resolveAction === 'warn' ? t('support.warnUser') : t('support.dismissReport')}>
        {resolveTarget && (
          <div className="space-y-4">
            <div className={`flex items-start gap-2.5 rounded-xl px-3 py-3 border ${resolveAction === 'warn' ? 'bg-amber-500/[0.05] border-amber-500/20' : 'bg-white/[0.03] border-white/[0.06]'}`}>
              {resolveAction === 'warn' ? <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" /> : <X size={13} className="text-slate-500 shrink-0 mt-0.5" />}
              <p className="text-xs text-slate-400 leading-relaxed">{resolveAction === 'warn' ? t('support.confirmWarn') : t('support.confirmDismiss')}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06] space-y-1.5">
              <p className="text-xs font-semibold text-white">{resolveTarget.ticket.subject}</p>
              <p className="text-[11px] text-slate-500 line-clamp-2">{resolveTarget.reason}</p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[10px] text-slate-600">{t('support.reportedBy')}: <span className="text-slate-500">{resolveTarget.reporter.fullName || resolveTarget.reporter.email}</span></span>
                {resolveTarget.user.warningCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
                    <AlertTriangle size={8} /> {resolveTarget.user.warningCount} {t('support.warningCount')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setResolveAction('warn')} className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${resolveAction === 'warn' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'border-white/[0.07] text-slate-500 hover:text-slate-300'}`}>{t('support.warnUser')}</button>
              <button onClick={() => setResolveAction('dismiss')} className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${resolveAction === 'dismiss' ? 'bg-white/[0.08] border-white/[0.15] text-slate-300' : 'border-white/[0.07] text-slate-500 hover:text-slate-300'}`}>{t('support.dismissReport')}</button>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('support.reviewNote')}</label>
              <textarea value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} rows={2} maxLength={500} placeholder={t('support.reviewNotePlaceholder')} className="w-full px-3 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-blue-500/50 resize-none placeholder-slate-600" />
            </div>
            {resolveError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{resolveError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => { setResolveTarget(null); setResolveNote(''); setResolveError(''); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">{t('common.cancel')}</button>
              <Button
                onClick={() => void handleResolveAbuse()}
                loading={resolving}
                className={resolveAction === 'warn' ? 'bg-amber-500 hover:bg-amber-400 text-white border-transparent' : 'bg-slate-600 hover:bg-slate-500 text-white border-transparent'}
              >
                {resolveAction === 'warn' ? t('support.warnUser') : t('support.dismissReport')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Manage Quick Replies Modal */}
      {managerMode && (
        <Modal open={showManageQR} onClose={() => { setShowManageQR(false); setEditingQRId(null); setEditQRTitle(''); setEditQRContent(''); }} title={t('support.manageQuickReplies')}>
          <div className="space-y-4">
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {quickReplies.length === 0 && <p className="text-xs text-slate-500 text-center py-6">{t('support.noQuickReplies')}</p>}
              {quickReplies.map((qr) => (
                <div key={qr.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
                  {editingQRId === qr.id ? (
                    <div className="space-y-2">
                      <input value={editQRTitle} onChange={(e) => setEditQRTitle(e.target.value)} maxLength={100} className="w-full px-2.5 py-1.5 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-violet-500/50" />
                      <textarea value={editQRContent} onChange={(e) => setEditQRContent(e.target.value)} rows={3} maxLength={2000} className="w-full px-2.5 py-1.5 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-violet-500/50 resize-none" />
                      <div className="flex gap-2">
                        <Button type="button" size="xs" onClick={() => void handleUpdateQuickReply()} loading={savingEditQR} disabled={savingEditQR || !editQRTitle.trim() || !editQRContent.trim()} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white border-transparent">{t('support.saveQuickReply')}</Button>
                        <button type="button" onClick={() => { setEditingQRId(null); setEditQRTitle(''); setEditQRContent(''); }} className="text-[10px] px-2 py-1.5 rounded-lg bg-white/[0.05] text-slate-400 hover:bg-white/[0.1] transition-colors">{t('common.cancel')}</button>
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
                          <button type="button" onClick={() => void confirmDeleteQuickReply(qr.id)} className="text-[10px] px-2 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">{t('common.confirm')}</button>
                          <button type="button" onClick={() => setDeletingQRId(null)} className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.05] text-slate-400 hover:bg-white/[0.1] transition-colors">{t('common.cancel')}</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          <button type="button" onClick={() => { setEditingQRId(qr.id); setEditQRTitle(qr.title); setEditQRContent(qr.content); }} className="p-1 rounded-md text-slate-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all"><Pencil size={11} /></button>
                          <button type="button" onClick={() => setDeletingQRId(qr.id)} className="p-1 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={11} /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-white/[0.06] pt-4 space-y-2">
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-2">{t('support.addQuickReply')}</p>
              <input value={newQRTitle} onChange={(e) => setNewQRTitle(e.target.value)} placeholder={t('support.quickReplyTitle')} maxLength={100} className="w-full px-3 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-violet-500/50 placeholder-slate-600" />
              <textarea value={newQRContent} onChange={(e) => setNewQRContent(e.target.value)} placeholder={t('support.quickReplyContent')} rows={3} maxLength={2000} className="w-full px-3 py-2 text-xs bg-[#0d0d14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-violet-500/50 resize-none placeholder-slate-600" />
              {qrError && <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">{qrError}</p>}
              <Button type="button" size="sm" onClick={() => void handleAddQuickReply()} loading={savingQR} disabled={savingQR || !newQRTitle.trim() || !newQRContent.trim()} icon={<Plus size={12} />} className="bg-violet-600 hover:bg-violet-500 text-white border-transparent">
                {t('support.addQuickReply')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Support Plan Access Modal */}
      {isSuperAdmin && (
        <Modal open={showAccessModal} onClose={() => setShowAccessModal(false)} title={t('support.planAccessTitle')} width="max-w-sm">
          <div className="space-y-5">
            <p className="text-xs text-slate-400 leading-relaxed">{t('support.planAccessDesc')}</p>

            <div className="space-y-2">
              {([
                { group: 'free'  as const, label: 'Free',  color: 'emerald', plans: ['free'] },
                { group: 'pro'   as const, label: 'Pro',   color: 'blue',    plans: ['pro', 'yearly'] },
                { group: 'ultra' as const, label: 'Ultra', color: 'amber',   plans: ['ultra', 'ultra_yearly'] },
              ]).map(({ group, label, color, plans }) => {
                const allIn = plans.every((p) => accessPlans.includes(p));
                return (
                  <button
                    key={group}
                    onClick={() => toggleAccessPlan(group)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      allIn
                        ? `border-${color}-500/30 bg-${color}-500/10`
                        : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${allIn ? `bg-${color}-400` : 'bg-slate-600'}`} />
                      <span className={`text-sm font-semibold ${allIn ? `text-${color}-300` : 'text-slate-500'}`}>
                        {label}
                      </span>
                      <span className="text-[10px] text-slate-600">{plans.join(', ')}</span>
                    </div>
                    <div className={`w-9 h-5 rounded-full transition-colors relative ${allIn ? `bg-${color}-500` : 'bg-white/10'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${allIn ? 'left-[18px]' : 'left-0.5'}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-3 py-2.5 text-[11px] text-amber-400/80 leading-relaxed">
              {t('support.planAccessWarning')}
            </div>

            {accessSaveError && (
              <p className="text-xs text-red-400 text-center">{accessSaveError}</p>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setShowAccessModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                {t('common.cancel')}
              </button>
              <Button
                onClick={() => void handleSaveAccessPlans()}
                loading={savingAccess}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-transparent"
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
