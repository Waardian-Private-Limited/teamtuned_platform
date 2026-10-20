'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '@/theme/tokens';
import { Skeleton } from '@/features/data-collection/components/shared/Ui';

interface DashCardProps {
  title: string;
  subtitle?: string | null;
  icon: LucideIcon;
  href?: string;
  hrefLabel?: string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
  children?: ReactNode;
}

/** One dashboard section. Each loads on its own, so a slow or failing card never holds up the others. */
export function DashCard({ title, subtitle, icon: Icon, href, hrefLabel = 'View all', loading, error, onRetry, className, children }: DashCardProps) {
  return (
    <section className={cx('flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5', className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-subtle text-fg">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-fg sm:text-base">{title}</h2>
            {subtitle && <p className="truncate text-xs text-fg-muted">{subtitle}</p>}
          </div>
        </div>
        {href && (
          <Link href={href} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg">
            {hrefLabel}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </header>
      {loading ? (
        <div className="flex flex-col gap-3" aria-busy>
          <Skeleton className="h-16" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center gap-3 py-2">
          <p className="text-sm text-[var(--tt-danger)]">{error}</p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle">
              <RotateCw className="h-3.5 w-3.5" aria-hidden />
              Try again
            </button>
          )}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

/** A number with its label; `tone="bad"` only when the number is something to act on. */
export function Stat({ label, value, sub, tone, href }: { label: string; value: string | number; sub?: string | null; tone?: 'bad' | 'good'; href?: string }) {
  const body = (
    <>
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
      <p className={cx('mt-1.5 truncate text-2xl font-extrabold leading-none tabular-nums', tone === 'bad' ? 'text-[var(--tt-danger)]' : tone === 'good' ? 'text-[var(--tt-success)]' : 'text-fg')}>{value}</p>
      {sub && <p className="mt-1.5 truncate text-xs text-fg-muted">{sub}</p>}
    </>
  );
  const cls = 'block min-w-0 rounded-xl border border-line bg-surface p-3.5';
  return href ? <Link href={href} className={cx(cls, 'transition-colors hover:border-line-strong')}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function EmptyLine({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-line px-3.5 py-3">
      <Icon className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">{title}</p>
        {hint && <p className="text-xs text-fg-muted">{hint}</p>}
      </div>
    </div>
  );
}
