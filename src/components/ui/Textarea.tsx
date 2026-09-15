'use client';

import { useId, useState } from 'react';
import { cx, field, text } from '@/theme/tokens';

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label: string;
  hint?: string;
  error?: string;
}

export function Textarea({ label, hint, error, disabled, rows = 3, ...rest }: TextareaProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <div>
      <label htmlFor={id} className={field.label}>
        {label}
      </label>
      <div
        className={cx(
          'rounded-[var(--tt-radius-control)] border bg-surface px-4 py-3 transition-all duration-150',
          disabled
            ? field.wrapperDisabled
            : hasError
              ? field.wrapperError
              : isFocused
                ? field.wrapperFocused
                : field.wrapperIdle
        )}
      >
        <textarea
          {...rest}
          id={id}
          rows={rows}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={error || hint ? messageId : undefined}
          onFocus={(e) => { setIsFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); rest.onBlur?.(e); }}
          className="w-full resize-none bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
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
