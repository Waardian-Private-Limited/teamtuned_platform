'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { Balance, BalanceSource } from '../types/leave';
import { days, fmtDate } from '../utils/format';

const CREDIT_LABEL = { earned: 'Earned', month: 'This month', quarter: 'This quarter', half_year: 'This half-year', year: 'Credited' } as const;
const USED_TEXT: Record<BalanceSource['kind'], string> = {
  leave_request: 'Leave taken', absence_adjusted: 'Absence adjusted at payroll', expired: 'Expired unused', encashed: 'Encashed', other: 'Other',
};

function Rows({ title, rows }: { title: string; rows: { label: string; date?: string; quantity: number }[] }) {
  if (!rows.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{title}</p>
      <ul className="mt-1 divide-y divide-line/60">
        {rows.map((r, i) => (
          <li key={i} className="flex items-baseline justify-between gap-2 py-1 text-xs">
            <span className="min-w-0 truncate text-fg">{r.label}{r.date && <span className="text-fg-muted"> · {fmtDate(r.date)}</span>}</span>
            <span className="shrink-0 font-semibold tabular-nums text-fg">{days(r.quantity)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Opens to show where used and pending days went. Hidden when there is nothing to explain. */
function WhereItWent({ b }: { b: Balance }) {
  const [open, setOpen] = React.useState(false);
  // Day by day, absences covered live on the attendance page; here they are one line.
  const sum = (xs: { quantity: number }[]) => xs.reduce((n, x) => n + x.quantity, 0);
  const covered = (b.used_breakdown ?? []).filter((u) => u.kind === 'absence_adjusted');
  const used: { label: string; date?: string; quantity: number }[] = [
    ...(b.used_breakdown ?? []).filter((u) => u.kind !== 'absence_adjusted').map((u) => ({ label: USED_TEXT[u.kind], date: u.date, quantity: u.quantity })),
    ...(covered.length ? [{ label: 'Absences covered', quantity: sum(covered) }] : []),
  ];
  const absence = b.absence_adjust?.items ?? [];
  const toCover = sum((b.pending_breakdown ?? []).filter((u) => u.kind === 'absence_adjusted')) + sum(absence);
  const pending: { label: string; date?: string; quantity: number }[] = [
    ...(b.pending_breakdown ?? []).filter((u) => u.kind !== 'absence_adjusted').map((u) => ({ label: 'Leave awaiting approval', date: u.date, quantity: u.quantity })),
    ...(toCover > 0 ? [{ label: 'Absences waiting to be covered', quantity: toCover }] : []),
  ];
  if (!used.length && !pending.length) return null;
  return (
    <div className="mt-1.5 border-t border-line/60 pt-1.5" onClick={(e) => e.stopPropagation()}>
      <span role="button" tabIndex={0} aria-expanded={open} onClick={() => setOpen((v) => !v)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v); }}
        className="flex w-full cursor-pointer items-center justify-between text-xs font-semibold text-fg-muted hover:text-fg">
        Details
        <ChevronDown aria-hidden className={cx('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </span>
      {open && <div className="mt-2 space-y-3"><Rows title="Used" rows={used} /><Rows title="Pending" rows={pending} /></div>}
    </div>
  );
}

const MODE_NOTE: Record<string, string> = { unlimited: 'No limit', per_event: 'Per occasion', none: 'No balance' };

export function BalanceCards({ balances, onPick }: { balances: Balance[]; onPick?: (b: Balance) => void }) {
  return (
    <div className={cx('grid w-full gap-2.5', balances.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
      {balances.map((b) => {
        const credited = (b.opening ?? 0) + (b.credited ?? 0) + (b.carried_in ?? 0) + (b.adjusted ?? 0);
        const absencePending = b.absence_adjust?.pending_quantity ?? 0;
        const plain = b.available == null;
        return (
          <button
            key={b.leave_type_id}
            type="button"
            disabled={!onPick}
            onClick={() => onPick?.(b)}
            className={cx(
              'flex w-full flex-col justify-between rounded-xl border border-line bg-surface px-3 py-2.5 text-left transition-all',
              'shadow-xs hover:border-fg-muted/40 hover:shadow-sm',
              onPick ? 'cursor-pointer hover:bg-bg-subtle/40' : 'cursor-default'
            )}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-fg break-words">{b.name}</p>
                {b.is_paid === false && (
                  <span className="shrink-0 rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">
                    Unpaid
                  </span>
                )}
              </div>

              {plain ? (
                <p className="mt-1 text-sm text-fg-muted break-words">
                  {MODE_NOTE[b.mode ?? ''] ?? '—'}{b.days_per_event ? ` · ${b.days_per_event} days` : ''}
                </p>
              ) : (
                <>
                  <div className="mt-1 flex items-baseline justify-between gap-3">
                    <span className="flex shrink-0 items-baseline gap-1">
                      <span className="text-2xl font-extrabold tracking-tight text-fg">{days(b.available).replace(' d', '')}</span>
                      <span className="text-xs text-fg-muted">left</span>
                    </span>
                    <span className="flex min-w-0 flex-wrap justify-end gap-x-2.5 text-xs">
                      <span className="whitespace-nowrap"><span className="text-fg-muted">{CREDIT_LABEL[b.credit_view?.scope ?? 'year']}</span> <span className="font-bold text-fg">{days(b.credit_view?.credited ?? credited)}</span></span>
                      <span className="whitespace-nowrap"><span className="text-fg-muted">Used</span> <span className="font-bold text-fg">{days(b.used)}</span></span>
                      <span className="whitespace-nowrap"><span className="text-fg-muted">Pending</span> <span className="font-bold text-fg">{days((b.pending ?? 0) + absencePending)}</span></span>
                    </span>
                  </div>
                  {b.credit_view?.brought_forward != null && <p className="mt-1 text-[11px] text-fg-muted">{days(b.credit_view.brought_forward)} brought forward</p>}
                  {absencePending > 0 && <p className="mt-1 text-[11px] text-fg-muted">{days(Math.max(0, (b.available ?? 0) - absencePending))} after this month&apos;s absences are covered</p>}
                </>
              )}
            </div>

            <WhereItWent b={b} />
            <div className="mt-1.5 space-y-0.5">
              {(b.locked ?? 0) > 0 && (
                <p className="text-xs text-fg-muted">{days(b.locked)} unlock when you are confirmed</p>
              )}
              {b.expiring && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--tt-danger)]">
                  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--tt-danger)]" />
                  <span>{days(b.expiring.quantity)} expire on {fmtDate(b.expiring.on)}</span>
                </div>
              )}
              {b.cycle && (
                <p className="text-[11px] text-fg-subtle">
                  Leave year: {fmtDate(b.cycle.start)} – {fmtDate(b.cycle.end)}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
