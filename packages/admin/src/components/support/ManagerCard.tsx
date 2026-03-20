import { ChevronRight } from 'lucide-react';
import type { ManagerStat } from './types';
import { resolveColor, responseColor } from './helpers';

interface ManagerCardProps {
  s: ManagerStat;
  t: (k: string) => string;
  onClick: () => void;
}

export function ManagerCard({ s, t, onClick }: ManagerCardProps) {
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
