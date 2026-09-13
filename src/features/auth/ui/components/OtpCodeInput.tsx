'use client';

import { useEffect, useRef } from 'react';
import { cx } from '@/theme/tokens';

interface OtpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length: number;
  disabled?: boolean;
  /** Fires once the last digit is typed, so the user never taps Verify. */
  onComplete?: (value: string) => void;
}

/**
 * Digit boxes backed by one hidden input. Using a single input (rather than one
 * per digit) keeps paste, autofill and the OS SMS suggestion working.
 */
export function OtpCodeInput({ value, onChange, length, disabled, onComplete }: OtpCodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, []);

  // Fire completion once per filled code; re-arm as soon as a digit is removed.
  useEffect(() => {
    if (value.length === length && !completedRef.current && !disabled) {
      completedRef.current = true;
      onComplete?.(value);
    }
    if (value.length < length) completedRef.current = false;
  }, [value, length, disabled, onComplete]);

  return (
    <div className="relative" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label={`${length} digit code`}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        className="absolute inset-0 z-10 w-full cursor-default opacity-0"
      />
      <div className="flex justify-center gap-2 sm:gap-3">
        {Array.from({ length }, (_, index) => {
          const digit = value[index] ?? '';
          const isCursor = index === value.length && !disabled;
          return (
            <div
              key={index}
              className={cx(
                'flex h-14 w-12 items-center justify-center rounded-md border-2 text-xl font-semibold text-fg transition-all duration-200 sm:h-16 sm:w-14',
                digit ? 'border-[var(--tt-primary)] bg-surface' : 'border-line bg-bg-subtle',
                isCursor && 'border-[var(--tt-primary)] ring-4 ring-[var(--tt-ring)]'
              )}
            >
              {digit || (isCursor ? <span className="h-6 w-px animate-pulse bg-fg" /> : null)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
