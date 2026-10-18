'use client';

import React, { useRef } from 'react';
import { cx } from '@/theme/tokens';

/**
 * 1–5 segmented rating (near-square buttons). A radio group: arrow keys move, Home/End jump,
 * 1–5 pick directly; roving tabindex keeps one tab stop.
 */
export function RatingScale({ value, onChange, label, invalid = false }: {
  value: number | null;
  onChange: (value: number) => void;
  label: string;
  invalid?: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const set = (n: number) => {
    onChange(n);
    requestAnimationFrame(() => refs.current[n - 1]?.focus());
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const at = value || 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); set(Math.min(5, at + 1)); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); set(Math.max(1, at - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); set(1); }
    else if (e.key === 'End') { e.preventDefault(); set(5); }
    else if (/^[1-5]$/.test(e.key)) { e.preventDefault(); set(Number(e.key)); }
  };
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown}
      className={cx('inline-flex shrink-0 gap-1', invalid && 'rounded-lg ring-1 ring-[var(--tt-danger)] ring-offset-2 ring-offset-[var(--tt-surface)]')}>
      {[1, 2, 3, 4, 5].map((n) => {
        const checked = value === n;
        return (
          <button
            key={n}
            ref={(el) => { refs.current[n - 1] = el; }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={`${n} of 5`}
            tabIndex={(value ? checked : n === 1) ? 0 : -1}
            onClick={() => set(n)}
            className={cx(
              'flex h-9 w-10 items-center justify-center rounded-md border text-sm font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-1',
              checked ? 'border-fg bg-fg text-[var(--tt-on-primary)]' : 'border-line bg-surface text-fg hover:bg-bg-subtle'
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
