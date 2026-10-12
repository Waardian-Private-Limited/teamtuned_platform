'use client';

import React from 'react';
import { ChevronsDown } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Skeleton } from '@/features/detailed-attendance/components/components/controls';
import { SESSION_TEXT, STATUS } from '../constants/leave.constants';
import type { LeaveRequest, LeaveStatus } from '../types/leave.model';
import { daysText, shortDate, dateText } from '../utils/format';

export function StatusBadge({ status }: { status: LeaveStatus }) {
  const s = STATUS[status];
  return <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', s.className)}>{s.label}</span>;
}

/** The leave type's own colour as a small mark, so types are told apart at a glance. */
export function TypeDot({ color, className }: { color: string | null; className?: string }) {
  return <span aria-hidden className={cx('inline-block h-2.5 w-2.5 shrink-0 rounded-full', className)} style={{ background: color || 'var(--tt-primary)' }} />;
}

/** "12 Mar – 14 Mar · first half", or "12 Mar 2026 · 2h". */
export function datesText(r: Pick<LeaveRequest, 'startDate' | 'endDate' | 'startSession' | 'endSession' | 'unit' | 'hours'>) {
  if (r.unit === 'hour') return `${dateText(r.startDate)} · ${r.hours ?? 0}h`;
  if (r.startDate === r.endDate) return `${dateText(r.startDate)}${r.startSession !== 'full' ? ` · ${SESSION_TEXT[r.startSession].toLowerCase()}` : ''}`;
  const from = `${shortDate(r.startDate)}${r.startSession === 'second_half' ? ' (2nd half)' : ''}`;
  const to = `${dateText(r.endDate)}${r.endSession === 'first_half' ? ' (1st half)' : ''}`;
  return `${from} – ${to}`;
}

export function daysLine(r: Pick<LeaveRequest, 'days' | 'lopDays' | 'unit' | 'hours'>) {
  if (r.unit === 'hour') return `${r.hours ?? 0}h`;
  return `${daysText(r.days)}${r.lopDays ? ` · ${daysText(r.lopDays)} unpaid` : ''}`;
}

/** Placeholders shaped like the cards they stand in for. */
export function BalanceSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-line bg-surface py-2.5 pl-4 pr-3">
          <div className="flex items-center gap-2"><Skeleton className="h-2.5 w-2.5 rounded-full" /><Skeleton className="h-4 w-28" /></div>
          <div className="mt-2 flex items-center justify-between"><Skeleton className="h-7 w-14" /><Skeleton className="h-3 w-32" /></div>
        </div>
      ))}
    </div>
  );
}

export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-line" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56 max-w-full" /></div>
          <Skeleton className="hidden h-4 w-16 sm:block" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

/**
 * A list with a fixed height that scrolls inside, so the page never grows with it. The scrollbar is always
 * painted and, while more lies below, a fade and a "Scroll for more" chip tell people there is more to see.
 */
export function ScrollArea({ children, className = 'max-h-80' }: { children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [more, setMore] = React.useState(false);
  const measure = React.useCallback(() => {
    const el = ref.current;
    if (el) setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [measure]);
  return (
    <div className="relative min-h-0">
      <div ref={ref} onScroll={measure} tabIndex={0} className={cx('tt-scrollbar-strong overflow-y-auto overscroll-contain focus-visible:outline-none', className)}>
        <div>{children}</div>
      </div>
      {more && (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-xl bg-gradient-to-t from-surface to-transparent" />
          <span aria-hidden className="pointer-events-none absolute bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-fg-muted shadow-sm">
            <ChevronsDown className="h-3 w-3" />Scroll for more
          </span>
        </>
      )}
    </div>
  );
}

export function SectionCard({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx('flex min-w-0 flex-col rounded-xl border border-line bg-surface', className)}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-bold text-fg sm:text-base">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}
