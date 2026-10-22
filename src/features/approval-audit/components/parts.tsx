'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cx } from '@/theme/tokens';

export type SortDir = 'asc' | 'desc';
export interface SortState<K extends string> { key: K; dir: SortDir }

/** Sorts a copy by a numeric or text accessor; nulls always last. */
export function sortRows<T, K extends string>(rows: T[], sort: SortState<K>, value: (row: T, key: K) => number | string | null): T[] {
  const sign = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = value(a, sort.key);
    const y = value(b, sort.key);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * sign;
    return String(x).localeCompare(String(y)) * sign;
  });
}

export const th = 'whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted';
export const td = 'whitespace-nowrap px-3 py-2.5 text-sm tabular-nums text-fg';

/** A column header that sorts its table; numbers start descending, text ascending. */
export function SortTh<K extends string>({ label, k, sort, onSort, numeric = true, className }: { label: string; k: K; sort: SortState<K>; onSort: (s: SortState<K>) => void; numeric?: boolean; className?: string }) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={cx(th, numeric && 'text-right', className)} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort({ key: k, dir: active ? (sort.dir === 'asc' ? 'desc' : 'asc') : numeric ? 'desc' : 'asc' })}
        className={cx('inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-fg', active && 'text-fg')}>
        {label}<Icon aria-hidden className={cx('h-3 w-3', !active && 'opacity-40')} />
      </button>
    </th>
  );
}

/** A small neutral tag; `solid` inverts it (ink ground) for what needs attention. */
export function Tag({ children, solid }: { children: ReactNode; solid?: boolean }) {
  return (
    <span className={cx('inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', solid ? 'bg-fg text-[var(--tt-fg-inverted)]' : 'border border-line text-fg-muted')}>
      {children}
    </span>
  );
}

/** A label above a value, for mobile cards. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">{label}</div>
      <div className="truncate text-sm font-semibold tabular-nums text-fg">{children}</div>
    </div>
  );
}

export const control = 'h-9 w-full min-w-0 rounded-[var(--tt-radius-control)] border border-line bg-surface px-3 text-sm font-semibold text-fg outline-none transition-colors hover:border-line-strong focus:border-[var(--tt-primary)] disabled:opacity-50';
