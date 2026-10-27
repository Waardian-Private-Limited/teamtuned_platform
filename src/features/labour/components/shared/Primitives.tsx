'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Block, FormError, PageHeader, primaryBtn, secondaryBtn } from '@/features/expense-bills/components/Primitives';

export { Block, FormError, PageHeader, primaryBtn, secondaryBtn };

export const selectCls = 'h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm';
// Cell and row styling shared by every labour table, matching the employee and approval tables.
export const th = 'border-b border-line bg-bg-subtle px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted select-none';
export const td = 'border-b border-line/60 px-4 py-3 align-top text-xs sm:text-sm';
/** Plain row: soft hover. */
export const trCls = 'transition-colors hover:bg-bg-subtle/60';
/** Row that opens something: pointer, hover and a keyboard focus state. */
export const trClickCls = 'cursor-pointer transition-colors hover:bg-bg-subtle/60 focus:bg-bg-subtle/60 focus:outline-none';

export function Gate({ enabled, allowed, what, children }: { enabled: boolean; allowed: boolean; what: string; children: React.ReactNode }) {
  if (!enabled || !allowed) {
    return (
      <div className="flex h-full flex-1 items-center justify-center rounded-xl border border-line bg-surface p-6">
        <EmptyState
          title={enabled ? 'You don’t have access' : 'Not switched on'}
          description={enabled ? `Ask your administrator for permission to see ${what}.` : 'Labour management is not enabled for your organization. Ask your TeamTuned administrator to turn it on.'}
        />
      </div>
    );
  }
  return <>{children}</>;
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] md:w-64">
      <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm" />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange('')} className="text-fg-subtle hover:text-fg">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options, anyLabel }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; anyLabel: string }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={cx(selectCls, 'min-w-0 md:w-40')}>
      <option value="">{anyLabel}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-fg-muted">
      {label}
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={cx(selectCls, 'min-w-0 flex-1 md:w-36')} />
    </label>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 md:flex-row md:flex-wrap md:items-center">{children}</div>;
}
export function FilterGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">{children}</div>;
}

export function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)]">
      <p className="truncate text-xs font-semibold text-fg-muted">{label}</p>
      <p className="mt-1.5 truncate text-xl font-extrabold tabular-nums text-fg">{value}</p>
      {note && <p className="mt-0.5 truncate text-[11px] text-fg-muted">{note}</p>}
    </div>
  );
}

interface ListShellProps {
  loading: boolean;
  fetching: boolean;
  error: string;
  empty: boolean;
  hasFilters: boolean;
  onClear: () => void;
  emptyTitle: string;
  emptyText: string;
  emptyAction?: { label: string; onClick: () => void };
  emptyIllustration?: { src: string; width: number; height: number; alt: string };
  page: number; totalPages: number; total: number; pageSize: number;
  onPage: (p: number) => void; onPageSize: (n: number) => void;
  children: React.ReactNode;
  minH?: string;
}

/** The bordered list panel: skeleton, error line, empty states, content and pagination. */
export function ListShell(p: ListShellProps) {
  return (
    <div className={cx('flex flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs', p.minH || 'min-h-[280px]')}>
      {p.error && <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{p.error}</p>}
      {p.loading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : p.empty ? (
        <div className="flex flex-1 items-center justify-center p-6">
          {p.hasFilters ? (
            <EmptyState compact title="Nothing matches" description="No results for the current search or filters." action={{ label: 'Clear filters', onClick: p.onClear, variant: 'link' }} />
          ) : (
            <EmptyState illustration={p.emptyIllustration} title={p.emptyTitle} description={p.emptyText} action={p.emptyAction ? { ...p.emptyAction } : undefined} />
          )}
        </div>
      ) : (
        <>
          <div className={cx('min-h-0 flex-1 overflow-auto tt-scroll-hidden transition-opacity duration-200', p.fetching ? 'opacity-70' : 'opacity-100')}>{p.children}</div>
          <div className="border-t border-line px-4 py-2.5">
            <Pagination currentPage={p.page} totalPages={p.totalPages} totalItems={p.total} pageSize={p.pageSize} onPageChange={p.onPage} onPageSizeChange={p.onPageSize} pageSizeOptions={[25, 50, 100]} />
          </div>
        </>
      )}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: Array<{ value: T; label: string }> }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line tt-scroll-hidden">
      {tabs.map((t) => (
        <button key={t.value} role="tab" type="button" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cx('-mb-px shrink-0 border-b-2 px-3 py-2 text-xs font-semibold sm:text-sm', value === t.value ? 'border-[var(--tt-primary)] text-fg' : 'border-transparent text-fg-muted hover:text-fg')}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'good' | 'bad' | 'warn' | 'dark' }) {
  const tones = {
    neutral: 'border-line bg-bg-subtle text-fg-muted',
    good: 'border-[var(--tt-success)]/25 bg-[var(--tt-success-soft)] text-[var(--tt-success)]',
    bad: 'border-[var(--tt-danger)]/25 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]',
    warn: 'border-[var(--tt-warning)]/30 bg-[var(--tt-warning)]/10 text-fg',
    dark: 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]',
  };
  return <span className={cx('inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize', tones[tone])}>{children}</span>;
}

/** Panel-less illustrated empty state for card grids and small lists. */
export function EmptyPanel({ illustration, title, text, action }: { illustration: { src: string; width: number; height: number; alt: string }; title: string; text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <EmptyState illustration={illustration} title={title} description={text} action={action} />
    </div>
  );
}
