import { Users, AlertTriangle, ChevronRight } from 'lucide-react';
import { AgentCard } from './AgentCard';
import { ManagerCard } from './ManagerCard';
import type { AgentStat, ManagerStat } from './types';
import { resolveColor, responseColor } from './helpers';

interface TeamViewProps {
  isSuperAdmin: boolean;
  selectedManager: ManagerStat | null;
  agentStats: AgentStat[];
  managerStats: ManagerStat[];
  globalUnassigned: number;
  statsLoading: boolean;
  statusFilter: string;
  priorityFilter: string;
  sortOrder: string;
  t: (k: string) => string;
  onManagerSelect: (m: ManagerStat) => void;
  onManagerBack: () => void;
  onViewAgentTickets: (agentId: number) => void;
}

export function TeamView({
  isSuperAdmin, selectedManager, agentStats, managerStats,
  globalUnassigned, statsLoading, t,
  onManagerSelect, onManagerBack, onViewAgentTickets,
}: TeamViewProps) {
  return (
    <div className="space-y-4">
      {isSuperAdmin && (
        <div className="flex items-center gap-2">
          {selectedManager ? (
            <>
              <button
                onClick={onManagerBack}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
              >
                {t('support.backToManagers')}
              </button>
              <ChevronRight size={12} className="text-slate-600" />
              <span className="text-xs text-white font-medium">
                {selectedManager.manager.fullName || selectedManager.manager.email}
              </span>
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

      {!statsLoading && isSuperAdmin && !selectedManager && (
        <>
          {managerStats.length === 0 && (
            <div className="text-center py-12 text-slate-600 text-sm">{t('support.noManagers')}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {managerStats.map((s) => (
              <ManagerCard key={s.manager.id} s={s} t={t} onClick={() => onManagerSelect(s)} />
            ))}
          </div>
        </>
      )}

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
                onViewTickets={() => onViewAgentTickets(s.agent.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
