import React from 'react';

export interface CardProps {
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  border?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const paddingClasses = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  padding = 'md',
  hover = false,
  border = true,
  className = '',
  children,
  onClick,
}: CardProps) {
  const isClickable = typeof onClick === 'function';

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`
        rounded-xl bg-[var(--bg-card)] text-[var(--text-primary)]
        ${paddingClasses[padding]}
        ${border ? 'border border-[var(--border)]' : ''}
        ${hover ? 'hover:bg-[var(--bg-card-hover)] transition-colors' : ''}
        ${isClickable ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--brand)]' : ''}
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
}
