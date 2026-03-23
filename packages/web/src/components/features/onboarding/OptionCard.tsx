import { type ElementType } from 'react';
import { Check } from 'lucide-react';

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
      className={`group relative w-full text-start p-4 rounded-2xl border-2 transition-all duration-200 ${
        selected
          ? 'border-[var(--brand)] bg-[var(--brand)]/8 shadow-md shadow-[var(--brand)]/15'
          : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--brand)]/40 hover:bg-[var(--bg-secondary)]'
      }`}
    >
      {/* checkmark — always at the trailing end (end-3 = left in RTL, right in LTR) */}
      <span className={`absolute top-3 end-3 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
        selected ? 'bg-[var(--brand)] scale-100 opacity-100' : 'scale-75 opacity-0'
      }`}>
        <Check className="w-3 h-3 text-white" strokeWidth={3} />
      </span>

      {/* Title + Icon row — Title first in DOM so RTL puts it on the right, LTR on the left */}
      <div className={`flex items-center justify-between gap-3 ${desc ? 'mb-1.5' : ''}`}>
        <span className="font-semibold text-sm text-[var(--text-primary)] leading-snug pe-6 flex-1">{title}</span>
        {Icon && (
          <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            selected
              ? 'bg-[var(--brand)]/15 text-[var(--brand)]'
              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] group-hover:text-[var(--brand)]'
          }`}>
            <Icon className="w-[18px] h-[18px]" />
          </span>
        )}
      </div>

      {desc && (
        <p className="text-xs leading-relaxed text-[var(--text-secondary)] pe-6">{desc}</p>
      )}
    </button>
  );
}
