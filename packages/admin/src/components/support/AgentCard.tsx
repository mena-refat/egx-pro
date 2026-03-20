import { ChevronRight } from 'lucide-react';
import type { AgentStat } from './types';
import { fmt, resolveColor, responseColor } from './helpers';

interface AgentCardProps {
  s: AgentStat;
  t: (k: string) => string;
  onViewTickets?: () => void;
}

export function AgentCard({ s, t, onViewTickets }: AgentCardProps) {
  const rate = s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 0;

  return (
    <div className="bg-[#111118] border border-white/[0.07] rounded-xl overflow-hidden hover:border-white/[0.12] transition-colors">
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
