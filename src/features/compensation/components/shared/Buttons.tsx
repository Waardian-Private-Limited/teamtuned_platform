'use client';

import React from 'react';
import { cx } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] shadow-xs',
  secondary: 'border border-line bg-surface text-fg hover:bg-bg-subtle',
  danger: 'bg-[var(--tt-danger)] text-white hover:opacity-90 shadow-xs',
  ghost: 'text-fg-muted hover:bg-bg-subtle hover:text-fg',
};

export function Btn({ variant = 'secondary', busy, icon, children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || busy}
      className={cx(
        'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm',
        VARIANTS[variant],
        className
      )}
    >
      {busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon}
      {children}
    </button>
  );
}
