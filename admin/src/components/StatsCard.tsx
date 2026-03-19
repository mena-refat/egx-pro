import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  accent?: 'emerald' | 'blue' | 'amber' | 'rose';
}

const accents = {
  emerald: 'text-emerald-400 bg-emerald-400/10',
  blue:    'text-blue-400 bg-blue-400/10',
  amber:   'text-amber-400 bg-amber-400/10',
  rose:    'text-rose-400 bg-rose-400/10',
};

export function StatsCard({ label, value, sub, icon: Icon, accent = 'emerald' }: Props) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#111118] p-5 flex flex-col gap-3 hover:border-white/[0.12] transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
        {Icon && (
          <span className={`p-1.5 rounded-md text-xs ${accents[accent]}`}>
            <Icon size={14} />
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-white tabular-nums">
          {typeof value === 'string' ? value : value.toLocaleString()}
        </p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

