'use client';

import { XCircle } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { money, monthLabel } from '@/features/salary-slips/utils/format';
import type { OtherDeduction } from '../../types/otherDeductions.model';
import { DeductionStatusBadge } from './DeductionStatusBadge';

interface DeductionTableProps {
  rows: OtherDeduction[];
  canCancel: boolean;
  onCancel: (row: OtherDeduction) => void;
}

const th =
  'border-b border-line bg-bg-subtle px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted select-none sm:px-4 sm:py-3 sm:text-xs 2xl:px-6 2xl:text-sm';
const td = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 2xl:px-6 2xl:py-4';

export function DeductionTable({ rows, canCancel, onCancel }: DeductionTableProps) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className={th}>Employee</th>
            <th className={th}>Reason</th>
            <th className={cx(th, 'hidden lg:table-cell')}>Month</th>
            <th className={cx(th, 'text-right')}>Amount</th>
            <th className={th}>Instalment</th>
            <th className={th}>Status</th>
            {canCancel && <th className={cx(th, 'text-right')}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={cx('transition-colors hover:bg-bg-subtle/50', row.status === 'cancelled' && 'opacity-60')}>
              <td className={td}>
                <div className="text-xs font-semibold text-fg sm:text-sm 2xl:text-base">{row.employeeName}</div>
                <div className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">{row.employeeCode || '—'}</div>
              </td>
              <td className={td}>
                <div className="max-w-[16rem] truncate text-xs text-fg sm:text-sm xl:max-w-sm" title={row.reason}>{row.reason}</div>
                {row.notes && <div className="mt-0.5 max-w-[16rem] truncate text-[11px] text-fg-muted xl:max-w-sm" title={row.notes}>{row.notes}</div>}
              </td>
              <td className={cx(td, 'hidden text-xs text-fg-muted sm:text-sm lg:table-cell')}>{monthLabel(row.month, 'short')}</td>
              <td className={cx(td, 'text-right text-xs font-semibold tabular-nums text-fg sm:text-sm 2xl:text-base')}>{money(-row.amount)}</td>
              <td className={cx(td, 'text-xs tabular-nums text-fg-muted sm:text-sm')}>
                {row.instalmentNo}/{row.instalmentCount}
              </td>
              <td className={td}>
                <DeductionStatusBadge status={row.status} />
              </td>
              {canCancel && (
                <td className={cx(td, 'text-right')}>
                  {row.canCancel ? (
                    <button
                      type="button"
                      onClick={() => onCancel(row)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:border-[var(--tt-danger)]/40 hover:text-[var(--tt-danger)]"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  ) : (
                    <span className="text-xs text-fg-subtle">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
