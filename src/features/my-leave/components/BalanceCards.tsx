'use client';

import React from 'react';
import { ChevronDown, Lock, Hourglass } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { Balance, BalanceSource, LeaveType } from '../types/leave.model';
import { daysBetween, daysText, num, shortDate } from '../utils/format';
import { TypeDot } from './LeaveParts';

const MODE_TEXT: Record<string, string> = {
  per_event: 'Granted per occasion',
  unlimited: 'No limit',
  none: 'Granted by HR',
};

const CREDIT_LABEL: Record<Balance['creditScope'], string> = {
  earned: 'Earned', month: 'This month', quarter: 'This quarter', half_year: 'This half-year', year: 'Credited',
};
const USED_TEXT: Record<BalanceSource['kind'], string> = {
  leave_request: 'Leave taken', absence_adjusted: 'Absence adjusted at payroll', expired: 'Expired unused', encashed: 'Encashed', other: 'Other',
};

function Stat({ label, value }: { label: string; value: number }) {
  return <span className="whitespace-nowrap"><span className="text-fg-muted">{label}</span> <span className="font-bold tabular-nums text-fg">{num(value)}</span></span>;
}

function SourceRows({ title, rows }: { title: string; rows: { key: string; label: string; date?: string; quantity: number }[] }) {
  if (!rows.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{title}</p>
      <ul className="mt-1 divide-y divide-line/60">
        {rows.map((r) => (
          <li key={r.key} className="flex items-baseline justify-between gap-2 py-1 text-xs">
            <span className="min-w-0 truncate text-fg">{r.label}{r.date && <span className="text-fg-muted"> · {shortDate(r.date)}</span>}</span>
            <span className="shrink-0 font-semibold tabular-nums text-fg">{daysText(r.quantity)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Opens to show where the used and pending days went; hidden when there is nothing to explain. */
function WhereItWent({ balance: b }: { balance: Balance }) {
  const [open, setOpen] = React.useState(false);
  const absence = b.absenceAdjust?.items ?? [];
  // Day by day, absences covered live on the attendance page; here they are one line.
  const sum = (xs: { quantity: number }[]) => xs.reduce((n, x) => n + x.quantity, 0);
  const covered = b.usedSources.filter((u) => u.kind === 'absence_adjusted');
  const used = [
    ...b.usedSources.filter((u) => u.kind !== 'absence_adjusted').map((u, i) => ({ key: `u${i}`, label: USED_TEXT[u.kind], date: u.date as string | undefined, quantity: u.quantity })),
    ...(covered.length ? [{ key: 'cov', label: 'Absences covered', date: undefined, quantity: sum(covered) }] : []),
  ];
  const heldAbsences = b.pendingSources.filter((u) => u.kind === 'absence_adjusted');
  const toCover = sum(heldAbsences) + sum(absence);
  const pending = [
    ...b.pendingSources.filter((u) => u.kind !== 'absence_adjusted').map((u, i) => ({ key: `p${i}`, label: 'Leave awaiting approval', date: u.date as string | undefined, quantity: u.quantity })),
    ...(toCover > 0 ? [{ key: 'abs', label: 'Absences waiting to be covered', date: undefined, quantity: toCover }] : []),
  ];
  const afterPayroll = b.absenceAdjust && b.absenceAdjust.quantity > 0 ? Math.max(0, b.available - b.absenceAdjust.quantity) : null;
  if (!used.length && !pending.length && b.broughtForward === null && afterPayroll === null) return null;
  return (
    <div className="mt-1.5 border-t border-line/60 pt-1.5">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-xs font-semibold text-fg-muted hover:text-fg">
        Details
        <ChevronDown aria-hidden className={cx('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 space-y-2.5">
          {b.broughtForward !== null && <p className="text-xs text-fg-muted">{daysText(b.broughtForward)} brought forward</p>}
          {afterPayroll !== null && <p className="text-xs text-fg-muted">{daysText(afterPayroll)} after this month&apos;s absences are covered</p>}
          <SourceRows title="Used" rows={used} />
          <SourceRows title="Pending" rows={pending} />
        </div>
      )}
    </div>
  );
}

/** One compact card per leave type: what is left, the numbers on one line, the next expiry; the rest opens under Details. */
export function BalanceCards({ types, today, onApply }: { types: LeaveType[]; today: string; onApply: (typeId: number) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {types.map((t) => {
        const b = t.balance;
        const next = b?.expiringLots[0];
        const left = next ? daysBetween(today, next.on) : 0;
        return (
          <article key={t.id} className="relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface py-2.5 pl-4 pr-3">
            <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: t.color || 'var(--tt-primary)' }} />
            <header className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <TypeDot color={t.color} />
                <span className="truncate text-sm font-semibold text-fg">{t.name}</span>
                {!t.isPaid && <span className="shrink-0 rounded border border-line px-1 text-[10px] font-semibold uppercase text-fg-muted">Unpaid</span>}
                {t.locked && <span title="Unlocks after probation" className="inline-flex shrink-0 items-center gap-0.5 rounded border border-line px-1 text-[10px] font-semibold uppercase text-fg-muted"><Lock className="h-2.5 w-2.5" />Locked</span>}
              </span>
              <button type="button" disabled={t.locked} onClick={() => onApply(t.id)}
                className="shrink-0 text-xs font-semibold text-[var(--tt-primary)] hover:underline disabled:cursor-not-allowed disabled:text-fg-subtle disabled:no-underline">
                Apply
              </button>
            </header>

            {b ? (
              <>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <p className="flex shrink-0 items-baseline gap-1">
                    <span className={cx('text-2xl font-extrabold tabular-nums tracking-tight', b.available < 0 ? 'text-[var(--tt-danger)]' : 'text-fg')}>{num(b.available)}</span>
                    <span className="text-xs text-fg-muted">left</span>
                  </p>
                  <p className="flex min-w-0 flex-wrap justify-end gap-x-2.5 text-xs">
                    <Stat label={CREDIT_LABEL[b.creditScope]} value={b.creditedInScope} />
                    <Stat label="Used" value={b.used} />
                    <Stat label="Pending" value={b.pending + (b.absenceAdjust?.quantity ?? 0)} />
                  </p>
                </div>
                {next && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    <Hourglass aria-hidden className="h-3 w-3 shrink-0" />
                    <span className="min-w-0 truncate">{daysText(next.quantity)} expire {shortDate(next.on)}{left <= 30 ? ` · ${left}d left` : ''}{b.expiringLots.length > 1 ? ` · +${b.expiringLots.length - 1} more` : ''}</span>
                  </p>
                )}
                <WhereItWent balance={b} />
              </>
            ) : (
              <p className="mt-1 text-sm font-semibold text-fg">{t.mode === 'per_event' && t.policy.credit.days_per_event !== null ? `${daysText(t.policy.credit.days_per_event)} each time` : MODE_TEXT[t.mode] ?? 'No balance yet'}</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
