'use client';

import { XCircle } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { money, monthLabel } from '@/features/salary-slips/utils/format';
import type { OtherDeduction } from '../../types/otherDeductions.model';
import { DeductionStatusBadge } from './DeductionStatusBadge';

interface DeductionCardListProps {
  rows: OtherDeduction[];
  canCancel: boolean;
  onCancel: (row: OtherDeduction) => void;
}

export function DeductionCardList({ rows, canCancel, onCancel }: DeductionCardListProps) {
  return (
    <>
      {rows.map((row) => (
        <div key={row.id} className={cx('p-4', row.status === 'cancelled' && 'opacity-60')}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-fg">{row.employeeName}</div>
              <div className="mt-0.5 truncate text-xs text-fg-muted">{row.employeeCode || '—'}</div>
            </div>
            <div className="text-right text-sm font-bold tabular-nums text-fg">{money(-row.amount)}</div>
          </div>
          <p className="mt-2 text-sm text-fg">{row.reason}</p>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 text-xs text-fg-muted">
              <DeductionStatusBadge status={row.status} />
              <span className="truncate">
                {monthLabel(row.month, 'short')} · {row.instalmentNo}/{row.instalmentCount}
              </span>
            </div>
            {canCancel && row.canCancel && (
              <button
                type="button"
                onClick={() => onCancel(row)}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:text-[var(--tt-danger)]"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
