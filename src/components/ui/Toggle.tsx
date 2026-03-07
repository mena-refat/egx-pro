import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  className = '',
}: ToggleProps) {
  return (
    <label
      className={`inline-flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`.trim()}
    >
      <span className="relative inline-block w-10 h-6 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <span
          className={`
            absolute inset-0 rounded-full transition-colors
            bg-[var(--border-strong)] peer-checked:bg-[var(--brand)]
            peer-focus:ring-2 peer-focus:ring-[var(--brand)] peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--bg-primary)]
          `.trim()}
        />
        <span
          className={`
            absolute top-1 start-1 w-4 h-4 rounded-full bg-white shadow-[var(--shadow-sm)]
            transition-transform peer-checked:translate-x-4
          `.trim()}
        />
      </span>
      {label && (
        <span className="text-sm text-[var(--text-primary)]">{label}</span>
      )}
    </label>
  );
}
