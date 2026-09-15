'use client';

import { useEffect, useRef } from 'react';
import { cx, text } from '@/theme/tokens';

interface OtpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length: number;
  disabled?: boolean;
  error?: string;
  onComplete?: (value: string) => void;
}

/**
 * One real input behind a row of drawn cells.
 *
 * The cells share the control radius used by fields and buttons, and size
 * themselves off the available width so six of them still fit on a 360px
 * screen without the row scrolling.
 */
export function OtpCodeInput({ value, onChange, length, disabled, error, onComplete }: OtpCodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const completedRef = useRef(false);
  const hasError = Boolean(error);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (value.length === length && !completedRef.current && !disabled) {
      completedRef.current = true;
      onComplete?.(value);
    }
    if (value.length < length) completedRef.current = false;
  }, [value, length, disabled, onComplete]);

  return (
    <div>
      <div className="relative" onClick={() => inputRef.current?.focus()}>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={`${length} digit code`}
          aria-invalid={hasError || undefined}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
          className="absolute inset-0 z-10 w-full cursor-default opacity-0"
        />
        <div className="flex justify-center gap-2 sm:gap-2.5">
          {Array.from({ length }, (_, index) => {
            const digit = value[index] ?? '';
            const isCursor = index === value.length && !disabled;
            return (
              <div
                key={index}
                className={cx(
                  'flex h-[52px] w-full max-w-[52px] flex-1 items-center justify-center',
                  'rounded-[var(--tt-radius-control)] border text-lg font-semibold text-fg',
                  'transition-all duration-150',
                  hasError
                    ? 'border-[var(--tt-danger)]'
                    : digit
                      ? 'border-line-strong bg-surface'
                      : 'border-line bg-bg-subtle',
                  !hasError && isCursor && 'border-[var(--tt-primary)] ring-4 ring-[var(--tt-ring)]'
                )}
              >
                {digit || (isCursor ? <span className="h-5 w-px animate-pulse bg-fg" /> : null)}
              </div>
            );
          })}
        </div>
      </div>
      {hasError && (
        <p role="alert" className={cx('mt-1.5 text-center', text.error)}>
          {error}
        </p>
      )}
    </div>
  );
}
