import React from 'react';
import { usePrivacyStore } from '../../store/privacyStore';

interface BlurNumProps {
  children: React.ReactNode;
  className?: string;
}

/** Wraps a monetary value — replaces it with •••• when privacy mode is on. Percentages stay visible. */
export function BlurNum({ children, className = '' }: BlurNumProps) {
  const isPrivate = usePrivacyStore((s) => s.isPrivate);
  if (isPrivate) {
    return (
      <span
        className={`select-none tracking-widest text-[var(--text-muted)] ${className}`}
        aria-hidden="true"
      >
        ••••
      </span>
    );
  }
  return <span className={className}>{children}</span>;
}
