'use client';

import { cx } from '@/theme/tokens';
import type { RowActionKind } from '../../hooks/useSalarySlipActions';
import type { SalarySlipRow } from '../../types/salarySlips.model';
import { money } from '../../utils/format';
import { SlipRowActions, type SlipRowHandlers, type SlipRowPolicy } from './SlipRowActions';
import { SlipStatusBadge } from './SlipStatusBadge';

interface SlipCardListProps extends SlipRowHandlers {
  rows: SalarySlipRow[];
  selected: Set<number>;
  onToggle: (employeeId: number) => void;
  policy: SlipRowPolicy;
  busyFor: (employeeId: number) => RowActionKind | null;
}

export function SlipCardList({ rows, selected, onToggle, policy, busyFor, ...handlers }: SlipCardListProps) {
  return (
    <>
      {rows.map((row) => {
        const isSelected = selected.has(row.employeeId);
        return (
          <div key={row.employeeId} className={cx('flex gap-3 p-4 transition-colors', isSelected && 'bg-bg-subtle/60')}>
            <input
              type="checkbox"
              aria-label={`Select ${row.name}`}
              checked={isSelected}
              onChange={() => onToggle(row.employeeId)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong accent-[var(--tt-primary)]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-fg">{row.name}</div>
                  <div className="mt-0.5 truncate text-xs text-fg-muted">{[row.code, row.site].filter(Boolean).join(' · ') || '—'}</div>
                </div>
                <div className="text-right text-sm font-bold tabular-nums text-fg">{money(row.netPay)}</div>
              </div>
              <div className="mt-2.5 flex min-w-0 items-center gap-2">
                <SlipStatusBadge status={row.status} reason={row.holdReason} align="start" />
                {row.payslipNumber && <span className="truncate font-mono text-[11px] text-fg-muted">{row.payslipNumber}</span>}
              </div>
              {row.status === 'held' && row.holdReason && <p className="mt-1 line-clamp-2 text-[11px] text-fg-muted">{row.holdReason}</p>}
              <div className="mt-2.5 flex justify-end">
                <SlipRowActions row={row} policy={policy} busy={busyFor(row.employeeId)} showLabels="always" {...handlers} />
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
