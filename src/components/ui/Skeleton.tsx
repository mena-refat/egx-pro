import React from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({
  width,
  height = '1rem',
  className = '',
}: SkeletonProps) {
  const style: React.CSSProperties = {
    height: typeof height === 'number' ? `${height}px` : height,
  };
  if (width != null) style.width = typeof width === 'number' ? `${width}px` : width;

  return (
    <span
      className={`block rounded-lg bg-[var(--border-subtle)] animate-pulse ${className}`.trim()}
      style={Object.keys(style).length ? style : undefined}
    />
  );
}
