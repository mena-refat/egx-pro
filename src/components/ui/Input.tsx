import React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  dir?: 'ltr' | 'rtl' | 'auto';
  inputClassName?: string;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    icon,
    iconPosition = 'left',
    disabled = false,
    dir = 'auto',
    inputClassName = '',
    wrapperClassName = '',
    id: idProp,
    ...rest
  },
  ref
) {
  const generatedId = React.useId();
  const id = idProp ?? generatedId;

  return (
    <div className={`block ${wrapperClassName}`.trim()}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
        >
          {label}
        </label>
      )}
      <div className={`relative ${error ? 'animate-shake' : ''}`}>
        {icon && iconPosition === 'left' && (
          <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-[var(--text-muted)] pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          dir={dir}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`
            w-full rounded-xl border bg-[var(--bg-input)] text-[var(--text-primary)] text-body
            placeholder:text-[var(--text-muted)]
            focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent input-focus-glow
            disabled:opacity-50 disabled:cursor-not-allowed
            ${icon && iconPosition === 'left' ? 'ps-10' : 'ps-3'}
            ${icon && iconPosition === 'right' ? 'pe-10' : 'pe-3'}
            py-2.5
            ${error ? 'border-[var(--danger)]' : 'border-[var(--border)]'}
            ${inputClassName}
          `.trim()}
          {...rest}
        />
        {icon && iconPosition === 'right' && (
          <span className="absolute inset-y-0 end-0 flex items-center pe-3 text-[var(--text-muted)] pointer-events-none">
            {icon}
          </span>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-[var(--text-muted)]">
          {hint}
        </p>
      )}
    </div>
  );
});
