'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { Installment } from '../../types/salaryAdvance.model';
import { money, monthLabel } from '../../utils/format';
import { InstallmentStatusBadge } from './StatusBadges';

const th = 'border-b border-line bg-bg-subtle px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted sm:px-4';
const td = 'border-b border-line/60 px-3.5 py-2.5 text-xs text-fg sm:px-4 sm:text-sm';

function PayrollRef({ row, payrollHref }: { row: Installment; payrollHref: ((runId: number) => string) | null }) {
  if (!row.payrollItemId) return <span className="text-fg-subtle">{row.reference || '—'}</span>;
  if (payrollHref && row.payrollRunId) {
    return (
      <Link href={payrollHref(row.payrollRunId)} className="inline-flex items-center gap-1 font-semibold text-fg hover:underline">
        Payroll <ExternalLink className="h-3 w-3" />
      </Link>
    );
  }
  return <span className="text-fg-muted">Payroll item #{row.payrollItemId}</span>;
}

export function ScheduleTable({ rows, payrollHref }: { rows: Installment[]; payrollHref: ((runId: number) => string) | null }) {
  const hasInterest = rows.some((r) => r.interest > 0);
  const totals = rows.reduce((acc, r) => ({ amount: acc.amount + r.amount, recovered: acc.recovered + r.recovered }), { amount: 0, recovered: 0 });

  return (
    <>
      <div className="hidden overflow-x-auto tt-scroll-hidden md:block">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={th}>#</th>
              <th className={th}>Month</th>
              {hasInterest && <th className={cx(th, 'text-right')}>Principal</th>}
              {hasInterest && <th className={cx(th, 'text-right')}>Interest</th>}
              <th className={cx(th, 'text-right')}>Amount</th>
              <th className={cx(th, 'text-right')}>Recovered</th>
              <th className={th}>Status</th>
              <th className={th}>Payroll / reference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={cx('transition-colors hover:bg-bg-subtle/50', (r.status === 'skipped' || r.status === 'waived') && 'opacity-60')}>
                <td className={cx(td, 'tabular-nums text-fg-muted')}>{r.seq}</td>
                <td className={td}>
                  {monthLabel(r.month, 'short')}
                  {r.note && <div className="mt-0.5 max-w-[14rem] truncate text-[11px] text-fg-muted" title={r.note}>{r.note}</div>}
                </td>
                {hasInterest && <td className={cx(td, 'text-right tabular-nums text-fg-muted')}>{money(r.principal)}</td>}
                {hasInterest && <td className={cx(td, 'text-right tabular-nums text-fg-muted')}>{money(r.interest)}</td>}
                <td className={cx(td, 'text-right font-semibold tabular-nums')}>{money(r.amount)}</td>
                <td className={cx(td, 'text-right tabular-nums')}>{r.recovered ? money(r.recovered) : <span className="text-fg-subtle">—</span>}</td>
                <td className={td}>
                  <InstallmentStatusBadge status={r.status} />
                </td>
                <td className={td}>
                  <PayrollRef row={r} payrollHref={payrollHref} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="px-3.5 py-2.5 text-xs font-semibold text-fg-muted sm:px-4" colSpan={hasInterest ? 4 : 2}>Total</td>
              <td className="px-3.5 py-2.5 text-right text-xs font-bold tabular-nums text-fg sm:px-4 sm:text-sm">{money(totals.amount)}</td>
              <td className="px-3.5 py-2.5 text-right text-xs font-bold tabular-nums text-fg sm:px-4 sm:text-sm">{money(totals.recovered)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((r) => (
          <li key={r.key} className={cx('flex items-center justify-between gap-3 px-4 py-3', (r.status === 'skipped' || r.status === 'waived') && 'opacity-60')}>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">
                <span className="mr-1.5 tabular-nums text-fg-muted">{r.seq}.</span>
                {monthLabel(r.month, 'short')}
              </p>
              <p className="mt-0.5 text-xs tabular-nums text-fg-muted">
                {money(r.amount)}
                {r.recovered > 0 && r.recovered < r.amount ? ` · ${money(r.recovered)} recovered` : ''}
              </p>
            </div>
            <InstallmentStatusBadge status={r.status} />
          </li>
        ))}
      </ul>
    </>
  );
}
