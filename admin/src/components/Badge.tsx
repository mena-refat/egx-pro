const styles: Record<string, string> = {
  free: 'bg-slate-700/60 text-slate-300',
  pro: 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30',
  yearly: 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30',
  ultra: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
  ultra_yearly: 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30',
  OPEN: 'bg-rose-500/15 text-rose-400',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-400',
  RESOLVED: 'bg-emerald-500/15 text-emerald-400',
  CLOSED: 'bg-slate-700/60 text-slate-400',
  URGENT: 'bg-red-500 text-white',
  HIGH: 'bg-orange-500/15 text-orange-400',
  NORMAL: 'bg-slate-700/60 text-slate-400',
  LOW: 'bg-slate-800 text-slate-500',
  SUPER_ADMIN: 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30',
  ADMIN: 'bg-slate-700/60 text-slate-300',
};

export function Badge({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
        styles[label] ?? 'bg-slate-700/60 text-slate-300'
      }`}
    >
      {label}
    </span>
  );
}

