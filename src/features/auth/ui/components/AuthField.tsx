'use client';

import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cx, field, text } from '@/theme/tokens';

interface AuthFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'prefix'> {
  label: string;
  icon?: React.ReactNode;
  prefix?: React.ReactNode;
  hint?: string;
  /** Validation message. Reddens the field and replaces the hint when set. */
  error?: string;
}

// Labelled text input with an optional leading icon and password reveal toggle.
export function AuthField({ label, icon, prefix, hint, error, type = 'text', disabled, ...rest }: AuthFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const [isFocused, setIsFocused] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const isPassword = type === 'password';
  const resolvedType = isPassword && isRevealed ? 'text' : type;
  const hasError = Boolean(error);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={text.label}>
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
          <span className={hasError ? 'text-[var(--tt-danger)]' : isFocused ? 'text-fg' : 'text-fg-subtle'}>
            {icon}
          </span>
        )}
        {prefix && (
          <span className="flex items-center text-sm font-semibold text-fg/80 select-none pr-2 border-r border-line shrink-0">
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
            className="p-1 text-fg-subtle transition-colors hover:text-fg"
          >
            {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {/* The error takes the hint's slot, so the field never changes height. */}
      {(error || hint) && (
        <p id={messageId} role={hasError ? 'alert' : undefined} className={hasError ? text.error : text.caption}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
