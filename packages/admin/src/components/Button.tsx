import React from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
export type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  /** Shows a spinner and disables the button while true. */
  loading?:   boolean;
  fullWidth?: boolean;
  /** Icon rendered to the left of children (hidden while loading). */
  icon?:      React.ReactNode;
  children:   React.ReactNode;
}

// ─── Style maps ──────────────────────────────────────────────────────────────

const VARIANTS: Record<ButtonVariant, string> = {
  primary:   'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white border-transparent',
  secondary: 'bg-white/[0.06] hover:bg-white/[0.10] text-slate-300 border border-white/[0.10]',
  danger:    'bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/25 text-red-400 border border-red-500/20',
  ghost:     'bg-transparent hover:bg-white/[0.06] text-slate-400 border-transparent',
  outline:   'bg-transparent border border-white/[0.14] text-slate-300 hover:bg-white/[0.06]',
  success:   'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20',
};

const SIZES: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1    text-[11px] gap-1   rounded-md',
  sm: 'px-3   py-1.5  text-xs     gap-1.5 rounded-lg',
  md: 'px-4   py-2    text-sm     gap-2   rounded-lg',
  lg: 'px-5   py-2.5  text-sm     gap-2   rounded-xl',
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Admin `Button` — mirrors the design of the web `Button` component.
 *
 * Pass `loading={true}` to show a spinner and disable the button automatically.
 * The `icon` prop is hidden while loading so the spinner takes its place.
 *
 * ```tsx
 * const { loading, run } = useRequest();
 * <Button loading={loading} onClick={() => run(() => api.delete('/item/1'))}>
 *   Delete
 * </Button>
 * ```
 */
export function Button({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  fullWidth = false,
  disabled,
  icon,
  className = '',
  children,
  type      = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        // Base
        'inline-flex items-center justify-center font-semibold transition-all duration-150 select-none',
        // Focus ring
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900',
        // Disabled
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {loading ? (
        <>
          <span
            className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
            aria-hidden
          />
          {children}
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
