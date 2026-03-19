import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'danger'
  | 'warning'
  | 'brand'
  | 'muted';

export interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]',
  success:
    'bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success)]/30',
  danger:
    'bg-[var(--danger-bg)] text-[var(--danger-text)] border border-[var(--danger)]/30',
  warning:
    'bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning)]/30',
  brand:
    'bg-[var(--brand-subtle)] text-[var(--brand-text)] border border-[var(--brand)]/30',
  muted:
    'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-subtle)]',
};

export function Badge({ variant = 'default', className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
