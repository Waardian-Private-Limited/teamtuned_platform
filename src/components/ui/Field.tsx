'use client';

import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cx, field, text } from '@/theme/tokens';

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'prefix'> {
  label: string;
  icon?: React.ReactNode;
  prefix?: React.ReactNode;
  hint?: string;
  error?: string;
}

export function Field({ label, icon, prefix, hint, error, type = 'text', disabled, ...rest }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const [isFocused, setIsFocused] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const isPassword = type === 'password';
  const resolvedType = isPassword && isRevealed ? 'text' : type;
  const hasError = Boolean(error);

  return (
    <div>
      <label htmlFor={id} className={field.label}>
        {label}
      </label>
      <div
        className={cx(
          field.wrapper,
          disabled
            ? field.wrapperDisabled
            : hasError
              ? field.wrapperError
              : isFocused
                ? field.wrapperFocused
                : field.wrapperIdle
        )}
      >
        {icon && (
          <span
            className={cx(
              'shrink-0 transition-colors',
              hasError ? 'text-[var(--tt-danger)]' : isFocused ? 'text-fg' : 'text-fg-subtle'
            )}
          >
            {icon}
          </span>
        )}
        {prefix && (
          <span className="flex shrink-0 select-none items-center border-r border-line pr-3 text-sm font-semibold text-fg">
            {prefix}
          </span>
        )}
        <input
          {...rest}
          id={id}
          type={resolvedType}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={error || hint ? messageId : undefined}
          onFocus={(e) => { setIsFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); rest.onBlur?.(e); }}
          className={field.input}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setIsRevealed((v) => !v)}
            disabled={disabled}
            aria-label={isRevealed ? 'Hide password' : 'Show password'}
            className="-mr-1 shrink-0 rounded-[var(--tt-radius-sm)] p-1.5 text-fg-subtle transition-colors hover:text-fg"
          >
            {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {(error || hint) && (
        <p
          id={messageId}
          role={hasError ? 'alert' : undefined}
          className={cx('mt-1.5', hasError ? text.error : text.caption)}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
