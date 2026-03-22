import React from 'react';
import { usePrivacyStore } from '../../store/privacyStore';

interface BlurNumProps {
  children: React.ReactNode;
  className?: string;
}

/** Wraps a monetary value — blurs it when privacy mode is on. Percentages stay visible. */
export function BlurNum({ children, className = '' }: BlurNumProps) {
  const isPrivate = usePrivacyStore((s) => s.isPrivate);
  return (
    <span
      className={`transition-[filter] duration-200 ${isPrivate ? 'blur-sm select-none' : ''} ${className}`}
    >
      {children}
    </span>
  );
}
