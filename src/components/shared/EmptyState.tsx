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
        py-20 px-8 text-center
        rounded-2xl border border-dashed border-[var(--border)]
        bg-[var(--bg-secondary)]
      "
      role="status"
      aria-label={title}
    >
      <div
        className="
          w-20 h-20 rounded-full
          bg-[var(--brand-subtle)]
          flex items-center justify-center
          mb-6
        "
      >
        <Icon
          className="w-16 h-16 text-[var(--brand)]"
          aria-hidden="true"
        />
      </div>

      <h3
        className="
          text-header font-semibold
          text-[var(--text-primary)] mb-2
        "
      >
        {title}
      </h3>

      {description && (
        <p
          className="
            text-body text-[var(--text-secondary)]
            max-w-xs mb-8 leading-relaxed
          "
        >
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="
            px-6 py-3 rounded-xl text-body font-semibold
            bg-[var(--brand)] text-white
            hover:bg-[var(--brand-hover)]
            shadow-md hover:shadow-lg
            transition-all duration-200 btn-press
          "
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
});

export default EmptyState;
