import { type ElementType } from 'react';

interface OptionCardProps {
  id: string;
  title: string;
  desc?: string;
  icon?: ElementType;
  selected: boolean;
  onClick: () => void;
}

export function OptionCard({ title, desc, icon: Icon, selected, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-right p-4 rounded-2xl border-2 transition-all bg-[var(--bg-card)]/60 hover:bg-[var(--bg-secondary)]/70 ${
        selected
          ? 'border-[var(--brand)] bg-[var(--brand)]/10 shadow-lg shadow-[var(--brand)]/20'
          : 'border-[var(--border)]'
      }`}
    >
      {Icon && (
        <div className="flex items-center gap-3 mb-1">
          <Icon className="w-5 h-5 text-[var(--brand)]" />
          <div className="font-semibold">{title}</div>
        </div>
      )}
      {!Icon && <div className="font-semibold mb-1">{title}</div>}
      {desc && <p className="text-xs text-[var(--text-secondary)]">{desc}</p>}
    </button>
  );
}
