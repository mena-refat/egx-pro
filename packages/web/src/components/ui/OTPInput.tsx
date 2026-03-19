import React, { useRef, useState, useCallback, type KeyboardEvent, type ClipboardEvent } from 'react';

const LENGTH = 6;

export interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  /** Optional: trigger shake when error */
  className?: string;
  inputClassName?: string;
}

export function OTPInput({
  value,
  onChange,
  onComplete,
  disabled,
  error,
  className = '',
  inputClassName = '',
}: OTPInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const digits = value.split('').concat(Array(LENGTH - value.length).fill('')).slice(0, LENGTH);

  const setDigit = useCallback(
    (index: number, char: string) => {
      const num = char.replace(/\D/g, '');
      if (num.length > 1) return;
      const next = value.split('');
      while (next.length < LENGTH) next.push('');
      next[index] = num;
      const newValue = next.join('').slice(0, LENGTH);
      onChange(newValue);
      if (newValue.length === LENGTH && onComplete) onComplete(newValue);
    },
    [value, onChange, onComplete]
  );

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
      setDigit(index - 1, '');
    }
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v.length > 1) {
      const nums = v.replace(/\D/g, '').slice(0, LENGTH).split('');
      let newVal = value.split('');
      nums.forEach((n, i) => {
        if (index + i < LENGTH) newVal[index + i] = n;
      });
      const joined = newVal.join('').slice(0, LENGTH);
      onChange(joined);
      const nextFocus = Math.min(index + nums.length, LENGTH - 1);
      refs.current[nextFocus]?.focus();
      if (joined.length === LENGTH && onComplete) onComplete(joined);
      return;
    }
    setDigit(index, v);
    if (v && index < LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!pasted) return;
    const next = value.split('');
    for (let i = 0; i < pasted.length && i < LENGTH; i++) next[i] = pasted[i];
    const newValue = next.join('').slice(0, LENGTH);
    onChange(newValue);
    const nextFocus = Math.min(pasted.length, LENGTH) - 1;
    refs.current[nextFocus]?.focus();
    if (newValue.length === LENGTH && onComplete) onComplete(newValue);
  };

  const filled = value.length === LENGTH;

  return (
    <div className={`flex gap-1.5 justify-center ${className}`} dir="ltr">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          value={d}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => setFocusedIndex(i)}
          onBlur={() => setFocusedIndex(null)}
          disabled={disabled}
          className={`
            w-10 h-12 text-center text-lg font-semibold rounded-xl border-2 bg-[var(--bg-input)] text-[var(--text-primary)]
            transition-all duration-150
            ${focusedIndex === i ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]/20' : 'border-[var(--border)]'}
            ${filled ? 'border-[var(--success)]' : ''}
            ${error ? 'border-[var(--danger)] animate-shake' : ''}
            focus:outline-none
            ${inputClassName}
          `}
        />
      ))}
    </div>
  );
}
