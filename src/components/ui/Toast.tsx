import React from 'react';

export type ToastVariant = 'default' | 'success' | 'danger' | 'warning';

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onDismiss?: () => void;
  className?: string;
}

const variantClasses: Record<ToastVariant, string> = {
  default:
    'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)]',
  success:
    'bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success)]/30',
  danger:
    'bg-[var(--danger-bg)] text-[var(--danger-text)] border border-[var(--danger)]/30',
  warning:
    'bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning)]/30',
};

export function Toast({
  message,
  variant = 'default',
  onDismiss,
  className = '',
}: ToastProps) {
  return (
    <div
      role="alert"
      className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm shadow-[var(--shadow-md)] ${variantClasses[variant]} ${className}`.trim()}
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 rounded hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
