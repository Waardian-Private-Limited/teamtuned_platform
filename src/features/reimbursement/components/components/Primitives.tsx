'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { ILLUSTRATIONS, categoryIcon } from '../../constants/reimbursement.constants';

export function Block({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-lg bg-bg-subtle', className)} />;
}

export function Panel({ title, aside, children, flush, className }: { title: string; aside?: React.ReactNode; children: React.ReactNode; flush?: boolean; className?: string }) {
  return (
    <section className={cx('overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--tt-shadow-sm)]', className)}>
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-sm font-bold text-fg">{title}</h2>
        {aside}
      </header>
      <div className={flush ? '' : 'p-4 sm:p-5'}>{children}</div>
    </section>
  );
}

export function Fact({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2 min-w-0' : 'min-w-0'}>
      <dt className="text-[11px] text-fg-muted sm:text-xs">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-fg">{value}</dd>
    </div>
  );
}

export function NoAccess({ what }: { what: string }) {
  return (
    <div className="flex h-full flex-1 items-center justify-center rounded-xl border border-line bg-surface p-6">
      <EmptyState illustration={ILLUSTRATIONS.review} title="You don’t have access" description={`Ask your administrator for permission to see ${what}.`} />
    </div>
  );
}

export function FeatureOff({ what }: { what: string }) {
  return (
    <div className="flex h-full flex-1 items-center justify-center rounded-xl border border-line bg-surface p-6">
      <EmptyState illustration={ILLUSTRATIONS.policy} title="Not switched on" description={`${what} is not enabled for your organization. Ask your TeamTuned administrator to turn it on.`} />
    </div>
  );
}

export function CategoryIcon({ icon, className, size = 'md' }: { icon: string | null | undefined; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = categoryIcon(icon);
  const box = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  const glyph = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <span className={cx('flex shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg', box, className)}>
      <Icon className={glyph} aria-hidden />
    </span>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5 2xl:p-4">
      <div className="min-w-0">
        <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">{title}</h1>
        {description && <p className="text-xs text-fg-muted sm:text-sm">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function FormError({ message, className }: { message?: string | null; className?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={cx('text-xs font-medium text-[var(--tt-danger)] sm:text-sm', className)}>
      {message}
    </p>
  );
}

export const primaryBtn =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 sm:text-sm 2xl:h-10';
export const secondaryBtn =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm 2xl:h-10';
