import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  icon: ReactNode;
}

export function StatCard({ label, value, color, icon }: StatCardProps) {
  return (
    <div className="bg-[#111118] px-3 py-3 flex flex-col gap-1">
      <div className={`${color} opacity-50`}>{icon}</div>
      <span className={`text-base font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-[10px] text-slate-600 leading-tight">{label}</span>
    </div>
  );
}
