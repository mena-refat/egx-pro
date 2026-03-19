import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { DataTable } from '../components/DataTable';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { MessageSquare, RefreshCw, Users, Clock, Star, UserCheck, UserPlus } from 'lucide-react';

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  assignedTo: number | null;
  assignedAt: string | null;
  assignedAgent: { fullName: string; email: string } | null;
  reply: string | null;
  repliedAt: string | null;
  rating: number | null;
  createdAt: string;
  user: { id: number; email: string | null; username: string | null; fullName: string | null; plan: string };
};

type AgentStat = {
  agent: { id: number; fullName: string; email: string };
  total: number;
  resolved: number;
  active: number;
  avgRating: number | null;
  ratingCount: number;
  avgResponseHours: number | null;
};

type Agent = { id: number; fullName: string; email: string };

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'text-red-400',
  HIGH: 'text-orange-400',
  NORMAL: 'text-slate-400',
  LOW: 'text-slate-600',
};

export default function SupportPage() {
  const { t } = useTranslation();

  const [managerMode, setManagerMode] = useState(false);
  const [tab, setTab] = useState<'all' | 'unassigned' | 'team'>('all');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [newStatus, setNewStatus] = useState('RESOLVED');
  const [saving, setSaving] = useState(false);

  const [assignTarget, setAssignTarget] = useState<Ticket | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assignTo, setAssignTo] = useState('');
  const [assigning, setAssigning] = useState(false);

  const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAgentId, setBulkAgentId] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);

  useEffect(() => {
    adminApi
      .get('/auth/me')
      .then((r) => {
        const a = r.data.data;
        const m = a.role === 'SUPER_ADMIN' || (a.permissions ?? []).includes('support.manage');
        setManagerMode(m);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!managerMode) return;
    adminApi
      .get('/support/agents')
      .then((r) => setAgents(r.data.data ?? []))
      .catch(() => null);
  }, [managerMode]);

  const load = useCallback(
    async (p = page, s = statusFilter, a = agentFilter, currentTab = tab) => {
      setLoading(true);
      try {
        const params: Record<string, string> = { page: String(p) };
        if (s) params.status = s;
        if (currentTab === 'unassigned') params.agentId = 'unassigned';
        else if (a) params.agentId = a;
        const r = await adminApi.get('/support', { params });
        setTickets(r.data.data.tickets ?? []);
        setTotal(r.data.data.total ?? 0);
      } catch {
        setTickets([]);
      } finally {
        setLoading(false);
      }
    },
    [page, statusFilter, agentFilter, tab]
  );

  useEffect(() => {
    void load(1, statusFilter, agentFilter, tab);
    setPage(1);
    setSelectedIds(new Set());
  }, [tab]); // eslint-disable-line

  useEffect(() => {
    void load(page, statusFilter, agentFilter, tab);
  }, [page]); // eslint-disable-line

  const loadTeamStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const r = await adminApi.get('/support/agents/stats');
      setAgentStats(r.data.data ?? []);
    } catch {
      setAgentStats([]);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'team') void loadTeamStats();
  }, [tab, loadTeamStats]);

  const handleReply = async () => {
    if (!selected || !reply.trim()) return;
    setSaving(true);
    try {
      await adminApi.patch(`/support/${selected.id}/reply`, { reply, status: newStatus });
      setSelected(null);
      setReply('');
      void load();
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0 || !bulkAgentId) return;
    setBulkAssigning(true);
    try {
      await adminApi.post('/support/bulk-assign', {
        ticketIds: [...selectedIds],
        agentId: parseInt(bulkAgentId, 10),
      });
      setSelectedIds(new Set());
      setBulkAgentId('');
      void load();
    } finally {
      setBulkAssigning(false);
    }
  };

  const handleAssign = async () => {
    if (!assignTarget) return;
    setAssigning(true);
    try {
      await adminApi.patch(`/support/${assignTarget.id}/assign`, {
        agentId: assignTo ? parseInt(assignTo, 10) : null,
      });
      setAssignTarget(null);
      setAssignTo('');
      void load();
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('support.title')}</h1>
          <p className="text-sm text-slate-500">
            {total} {t('support.tickets')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="p-2 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
              void load(1, e.target.value, agentFilter, tab);
            }}
            className="px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none"
          >
            <option value="">{t('support.all')}</option>
            <option value="OPEN">{t('support.open')}</option>
            <option value="IN_PROGRESS">{t('support.inProgress')}</option>
            <option value="RESOLVED">{t('support.resolved')}</option>
            <option value="CLOSED">{t('support.closed')}</option>
          </select>
          {managerMode && tab !== 'unassigned' && tab !== 'team' && (
            <select
              value={agentFilter}
              onChange={(e) => {
                setAgentFilter(e.target.value);
                setPage(1);
                void load(1, statusFilter, e.target.value, tab);
              }}
              className="px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none"
            >
              <option value="">{t('support.allAgents')}</option>
              {agents.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.fullName || a.email}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tabs — manager only */}
      {managerMode && (
        <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/[0.06] rounded-xl w-fit">
          {([
            { key: 'all', label: t('support.all') },
            { key: 'unassigned', label: t('support.unassigned'), icon: <UserPlus size={13} /> },
            { key: 'team', label: t('support.myTeam'), icon: <Users size={13} /> },
          ] as { key: 'all' | 'unassigned' | 'team'; label: string; icon?: React.ReactNode }[]).map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === item.key ? 'bg-white/[0.1] text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* My Team Tab */}
      {tab === 'team' && managerMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {statsLoading && (
            <p className="text-slate-500 text-sm col-span-3 py-8 text-center">{t('common.loading')}</p>
          )}
          {!statsLoading && agentStats.length === 0 && (
            <p className="text-slate-600 text-sm col-span-3 py-8 text-center">{t('support.noAgents')}</p>
          )}
          {agentStats.map((s) => {
            const resolveRate = s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 0;
            return (
              <div
                key={s.agent.id}
                className="bg-[#111118] border border-white/[0.07] rounded-xl p-5 space-y-4 hover:border-white/[0.12] transition-colors"
              >
                {/* Agent header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{s.agent.fullName || '—'}</p>
                    <p className="text-xs text-slate-500">{s.agent.email}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                      s.active > 5
                        ? 'bg-red-500/15 text-red-400'
                        : s.active > 0
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-emerald-500/15 text-emerald-400'
                    }`}
                  >
                    {s.active} {t('support.activeTickets')}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xl font-bold text-white">{s.total}</p>
                    <p className="text-xs text-slate-500">{t('support.totalTickets')}</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-400">{s.resolved}</p>
                    <p className="text-xs text-slate-500">{t('support.resolved')}</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-amber-400">
                      {s.avgRating ? `${s.avgRating}★` : '—'}
                    </p>
                    <p className="text-xs text-slate-500">{t('support.rating')}</p>
                  </div>
                </div>

                {/* Resolve rate bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">{t('support.resolveRate')}</span>
                    <span className="font-semibold text-white">{resolveRate}%</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        resolveRate >= 80
                          ? 'bg-emerald-500'
                          : resolveRate >= 50
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${resolveRate}%` }}
                    />
                  </div>
                </div>

                {/* Response time */}
                {s.avgResponseHours !== null && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1 border-t border-white/[0.05]">
                    <Clock size={11} />
                    {t('support.avgResponse')}:{' '}
                    <span className="font-semibold text-white">{s.avgResponseHours}h</span>
                    {s.ratingCount > 0 && (
                      <>
                        <span className="text-slate-600 mx-1">·</span>
                        <Star size={11} className="text-amber-400" />
                        <span className="text-slate-400">
                          {s.ratingCount} {t('support.ratings')}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <DataTable
            headers={[
              ...(managerMode ? [''] : []),
              t('support.subject'),
              t('support.user'),
              t('support.status'),
              t('support.priority'),
              ...(managerMode ? [t('support.assignedTo')] : []),
              t('support.date'),
              '',
            ]}
            loading={loading}
            rowCount={tickets.length}
            empty={t('support.noTickets')}
          >
            {tickets.map((tk) => (
              <tr
                key={tk.id}
                className="hover:bg-white/[0.02] transition-colors border-b border-white/[0.04] last:border-0"
              >
                {managerMode && (
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tk.id)}
                      onChange={(e) => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(tk.id); else next.delete(tk.id);
                          return next;
                        });
                      }}
                      className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <p className="text-sm text-white font-medium">{tk.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{tk.message}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-slate-300">{tk.user?.fullName ?? tk.user?.username ?? '—'}</p>
                  <p className="text-xs text-slate-500">{tk.user?.email ?? '—'}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge label={tk.status} />
                </td>
                <td className={`px-4 py-3 text-xs font-semibold ${PRIORITY_COLORS[tk.priority] ?? 'text-slate-400'}`}>
                  {tk.priority}
                </td>
                {managerMode && (
                  <td className="px-4 py-3">
                    {tk.assignedAgent ? (
                      <div>
                        <p className="text-xs font-medium text-slate-300">
                          {tk.assignedAgent.fullName || tk.assignedAgent.email}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs italic text-slate-600">{t('support.unassigned')}</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                  {new Date(tk.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSelected(tk);
                        setReply(tk.reply ?? '');
                        setNewStatus('RESOLVED');
                      }}
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                      <MessageSquare size={12} /> {t('support.reply')}
                    </button>
                    {managerMode && (
                      <button
                        onClick={() => {
                          setAssignTarget(tk);
                          setAssignTo(tk.assignedTo ? String(tk.assignedTo) : '');
                        }}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                      >
                        <UserCheck size={12} /> {t('support.assign')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
          <Pagination
            page={page}
            totalPages={Math.ceil(total / 20)}
            total={total}
            limit={20}
            onChange={setPage}
          />
        </>
      )}

      {/* Bulk assign bar */}
      {managerMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#1a1a2e] border border-blue-500/30 rounded-xl px-5 py-3 shadow-2xl shadow-blue-500/10">
          <span className="text-sm font-semibold text-white">{selectedIds.size} {t('support.ticketsSelected')}</span>
          <span className="text-slate-600">·</span>
          <select
            value={bulkAgentId}
            onChange={(e) => setBulkAgentId(e.target.value)}
            className="px-3 py-1.5 text-sm bg-[#111118] border border-white/[0.1] rounded-lg text-slate-300 focus:outline-none"
          >
            <option value="">{t('support.assignTo')}</option>
            {agents.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.fullName || a.email}
              </option>
            ))}
          </select>
          <button
            onClick={() => void handleBulkAssign()}
            disabled={bulkAssigning || !bulkAgentId}
            className="px-4 py-1.5 text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-white rounded-lg disabled:opacity-50 transition-all"
          >
            {bulkAssigning ? t('common.saving') : t('support.confirmAssign')}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {/* Reply Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={t('support.replyToTicket')}>
        {selected && (
          <div className="space-y-4">
            <div className="bg-[#0d0d14] rounded-lg p-4 border border-white/[0.06]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">{selected.user?.email}</p>
                <Badge label={selected.priority} />
              </div>
              <p className="text-sm font-semibold text-white mb-2">{selected.subject}</p>
              <p className="text-sm text-slate-300 leading-relaxed">{selected.message}</p>
              {selected.rating != null && (
                <div className="mt-3 flex items-center gap-1 text-xs text-amber-400">
                  <Star size={11} fill="currentColor" /> {t('support.rating')}: {selected.rating}/5
                </div>
              )}
            </div>
            {selected.reply && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                <p className="text-xs text-emerald-400 font-medium mb-1">{t('support.previousReply')}</p>
                <p className="text-xs text-slate-400">{selected.reply}</p>
              </div>
            )}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('support.yourReply')}</label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('support.setStatus')}</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none"
              >
                <option value="IN_PROGRESS">{t('support.inProgress')}</option>
                <option value="RESOLVED">{t('support.resolved')}</option>
                <option value="CLOSED">{t('support.closed')}</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-slate-400">
                {t('common.cancel')}
              </button>
              <button
                onClick={() => void handleReply()}
                disabled={saving || !reply.trim()}
                className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all"
              >
                {saving ? t('common.sending') : t('support.sendReply')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Assign Modal */}
      <Modal open={!!assignTarget} onClose={() => setAssignTarget(null)} title={t('support.assignTicket')}>
        {assignTarget && (
          <div className="space-y-4">
            <div className="bg-[#0d0d14] rounded-lg p-3 border border-white/[0.06]">
              <p className="text-sm font-semibold text-white">{assignTarget.subject}</p>
              <p className="text-xs text-slate-500 mt-1">
                {assignTarget.user?.fullName ?? assignTarget.user?.email}
              </p>
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
                {agents.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.fullName || a.email}
                  </option>
                ))}
              </select>
            </div>
            {assignTo && (
              <div className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                {t('support.assignNote')}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setAssignTarget(null)} className="px-4 py-2 text-sm text-slate-400">
                {t('common.cancel')}
              </button>
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
    </div>
  );
}
