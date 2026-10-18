'use client';

import { useRef } from 'react';
import { Star } from 'lucide-react';
import { cx } from '@/theme/tokens';

interface RatingStarsProps {
  value: number | null;
  /** Omit for read-only. Selecting the current value again clears it. */
  onChange?: (value: number | null) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  label?: string;
}

/**
 * 1–5 rating. Interactive mode is a radio group: arrow keys move, Home/End
 * jump, Delete/Backspace/0 clears; roving tabindex keeps one tab stop.
 */
export function RatingStars({ value, onChange, size = 'md', disabled, label = 'Rating' }: RatingStarsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5';
  const current = value ?? 0;

  if (!onChange) {
    return (
      <span className="inline-flex items-center gap-0.5" role="img" aria-label={value ? `${label}: ${value} of 5` : `${label}: not rated`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={cx(icon, n <= current ? 'fill-fg text-fg' : 'text-line-strong')} />
        ))}
      </span>
    );
  }

  const set = (n: number | null) => {
    if (disabled) return;
    onChange(n);
    const focusAt = (n ?? 1) - 1;
    requestAnimationFrame(() => refs.current[focusAt]?.focus());
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const at = current || 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); set(Math.min(5, at + 1)); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); set(at <= 1 ? null : at - 1); }
    else if (e.key === 'Home') { e.preventDefault(); set(1); }
    else if (e.key === 'End') { e.preventDefault(); set(5); }
    else if (e.key === 'Delete' || e.key === 'Backspace' || e.key === '0') { e.preventDefault(); set(null); }
    else if (/^[1-5]$/.test(e.key)) { e.preventDefault(); set(Number(e.key)); }
  };

  return (
    <div role="radiogroup" aria-label={label} className={cx('inline-flex items-center gap-0.5', disabled && 'opacity-50')} onKeyDown={onKeyDown}>
      {[1, 2, 3, 4, 5].map((n) => {
        const checked = n === current;
        const tabbable = current ? checked : n === 1;
        return (
          <button
            key={n}
            ref={(el) => { refs.current[n - 1] = el; }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            tabIndex={tabbable ? 0 : -1}
            disabled={disabled}
            onClick={() => set(checked ? null : n)}
            className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)]"
          >
            <Star className={cx(icon, n <= current ? 'fill-fg text-fg' : 'text-line-strong hover:text-fg-muted')} />
          </button>
        );
      })}
    </div>
  );
}
