import type { ReactNode } from 'react';
import { cx } from '@/theme/tokens';

/** The dashboard's panel: square-ish corners, a hairline border and a soft shadow. */
export function Card({ title, subtitle, action, children, className }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5', className)}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-bold text-fg">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** A pulsing placeholder block for loading states. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-lg bg-bg-subtle', className)} />;
}
