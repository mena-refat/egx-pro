import React from 'react';
import { usePrivacyStore } from '../../store/privacyStore';

interface BlurNumProps {
  children: React.ReactNode;
  className?: string;
}

/** Wraps a monetary value — blurs it when privacy mode is on. Percentages stay visible. */
export function BlurNum({ children, className = '' }: BlurNumProps) {
  const isPrivate = usePrivacyStore((s) => s.isPrivate);
  if (isPrivate) {
    return (
      <span
        className={`select-none transition-[filter] duration-300 ${className}`}
        style={{ filter: 'blur(8px)' }}
        aria-hidden="true"
      >
        {children}
      </span>
    );
  }
  return <span className={className}>{children}</span>;
}
