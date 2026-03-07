import { memo } from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState = memo(function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      className="
        flex flex-col items-center justify-center
        py-16 px-6 text-center
        rounded-2xl border border-dashed border-[var(--border)]
        bg-[var(--bg-secondary)]
      "
      role="status"
      aria-label={title}
    >
      <div
        className="
          w-16 h-16 rounded-full
          bg-[var(--brand-subtle)]
          flex items-center justify-center
          mb-4
        "
      >
        <Icon
          className="w-8 h-8 text-[var(--brand)]"
          aria-hidden="true"
        />
      </div>

      <h3
        className="
          text-base font-semibold
          text-[var(--text-primary)] mb-2
        "
      >
        {title}
      </h3>

      {description && (
        <p
          className="
            text-sm text-[var(--text-secondary)]
            max-w-xs mb-6
          "
        >
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="
            px-5 py-2.5 rounded-xl text-sm font-semibold
            bg-[var(--brand)] text-white
            hover:bg-[var(--brand-hover)]
            transition-colors
          "
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
});

export default EmptyState;
