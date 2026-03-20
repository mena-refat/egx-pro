import type { Agent } from './types';

interface BulkActionBarProps {
  selectedIds: Set<string>;
  agents: Agent[];
  bulkAgentId: string;
  bulkAssigning: boolean;
  bulkStatusing: boolean;
  bulkError: string;
  bulkConfirm: 'RESOLVED' | 'CLOSED' | null;
  t: (k: string) => string;
  onAgentChange: (id: string) => void;
  onBulkAssign: () => void;
  onBulkConfirm: (status: 'RESOLVED' | 'CLOSED') => void;
  onBulkExecute: (status: 'RESOLVED' | 'CLOSED') => void;
  onCancelConfirm: () => void;
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedIds, agents, bulkAgentId, bulkAssigning, bulkStatusing,
  bulkError, bulkConfirm, t,
  onAgentChange, onBulkAssign, onBulkConfirm, onBulkExecute, onCancelConfirm, onClearSelection,
}: BulkActionBarProps) {
  if (selectedIds.size === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 bg-[#12121f] border border-blue-500/25 rounded-2xl px-5 py-3 shadow-2xl shadow-black/50 backdrop-blur-sm">
      {bulkConfirm ? (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <span className="text-sm text-slate-300">
            {bulkConfirm === 'RESOLVED' ? t('support.bulkResolve') : t('support.bulkClose')} {selectedIds.size} {t('support.tickets')}?
          </span>
          <button
            onClick={() => onBulkExecute(bulkConfirm)}
            disabled={bulkStatusing}
            className={`px-4 py-1.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-all ${
              bulkConfirm === 'RESOLVED' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-600 hover:bg-slate-500'
            }`}
          >
            {bulkStatusing ? t('common.saving') : t('common.confirm')}
          </button>
          <button onClick={onCancelConfirm} className="px-4 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
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
            onChange={(e) => onAgentChange(e.target.value)}
            className="px-3 py-1.5 text-sm bg-[#1a1a2e] border border-white/[0.1] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500/50 min-w-[160px]"
          >
            <option value="">{t('support.chooseAgent')}</option>
            {agents.map((a) => <option key={a.id} value={String(a.id)}>{a.fullName || a.email}</option>)}
          </select>
          <button
            onClick={onBulkAssign}
            disabled={bulkAssigning || !bulkAgentId}
            className="px-4 py-1.5 text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-white rounded-lg disabled:opacity-50 transition-all"
          >
            {bulkAssigning ? t('common.saving') : t('support.confirmAssign')}
          </button>
          <div className="w-px h-4 bg-white/[0.1]" />
          <button
            onClick={() => onBulkConfirm('RESOLVED')}
            disabled={bulkStatusing}
            className="px-4 py-1.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50 transition-all"
          >
            {t('support.bulkResolve')}
          </button>
          <button
            onClick={() => onBulkConfirm('CLOSED')}
            disabled={bulkStatusing}
            className="px-4 py-1.5 text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 transition-all"
          >
            {t('support.bulkClose')}
          </button>
          <button onClick={onClearSelection} aria-label="Clear selection" className="text-xs text-slate-600 hover:text-slate-300 transition-colors">✕</button>
        </div>
      )}
      {bulkError && <p className="text-[11px] text-red-400">{bulkError}</p>}
    </div>
  );
}
