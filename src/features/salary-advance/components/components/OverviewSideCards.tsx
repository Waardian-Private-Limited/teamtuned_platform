'use client';

import Link from 'next/link';
import { ArrowRight, CalendarClock, CheckCircle2, CircleDollarSign, Hourglass, Layers, ListChecks } from 'lucide-react';
import type { Overview } from '../../types/salaryAdvance.model';
import { money, monthLabel, plural } from '../../utils/format';
import { Block } from './StatusBadges';

export function DueNextPayrollCard({ due, loading, href }: { due: Overview['dueNextPayroll']; loading: boolean; href: string }) {
  return (
    <section className="flex flex-col rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5">
      <header className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-subtle text-fg">
          <CalendarClock className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-fg">Due in next payroll</h2>
          <p className="text-xs text-fg-muted">{due ? monthLabel(due.month) : 'Instalments to recover'}</p>
        </div>
      </header>
      {loading ? (
        <div className="space-y-2">
          <Block className="h-9 w-2/3" />
          <Block className="h-4 w-1/2" />
        </div>
      ) : due && due.amount > 0 ? (
        <>
          <p className="text-3xl font-extrabold tabular-nums text-fg">{money(due.amount)}</p>
          <p className="mt-1 text-sm text-fg-muted">From {plural(due.employees, 'employee')}</p>
          <p className="mt-3 text-xs leading-relaxed text-fg-muted">
            Payroll recovers this unless a deduction would take more than the policy’s share of net pay; the rest carries to the month after.
          </p>
          <Link href={href} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-fg hover:underline">
            See active advances <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </>
      ) : (
        <p className="text-sm text-fg-muted">Nothing is due in the next payroll.</p>
      )}
    </section>
  );
}

export function QuickLinks({ listHref, typesHref, counts }: { listHref: (status: string) => string; typesHref: string | null; counts: Overview['kpis'] | null }) {
  const links = [
    { label: 'Waiting for approval', href: listHref('pending'), icon: Hourglass, count: counts?.pendingCount },
    { label: 'To disburse', href: listHref('to_disburse'), icon: CircleDollarSign, count: counts?.toDisburseCount },
    { label: 'Active advances', href: listHref('active'), icon: ListChecks, count: counts?.activeCount },
    { label: 'Closed', href: listHref('closed'), icon: CheckCircle2 },
    ...(typesHref ? [{ label: 'Advance types', href: typesHref, icon: Layers, count: undefined }] : []),
  ];
  return (
    <section className="rounded-xl border border-line bg-surface p-2 shadow-[var(--tt-shadow-sm)]">
      <h2 className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Go to</h2>
      <ul>
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-bg-subtle">
              <l.icon className="h-4 w-4 shrink-0 text-fg-muted" />
              <span className="flex-1 truncate text-sm font-semibold text-fg">{l.label}</span>
              {typeof l.count === 'number' && (
                <span className="rounded-md border border-line bg-bg-subtle px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-fg-muted">{l.count}</span>
              )}
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
