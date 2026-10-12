'use client';

import { cx } from '@/theme/tokens';
import type { RowActionKind } from '../../hooks/useSalarySlipActions';
import type { SalarySlipRow } from '../../types/salarySlips.model';
import { money } from '../../utils/format';
import { SlipRowActions, type SlipRowHandlers, type SlipRowPolicy } from './SlipRowActions';
import { SlipStatusBadge } from './SlipStatusBadge';

interface SlipTableProps extends SlipRowHandlers {
  rows: SalarySlipRow[];
  selected: Set<number>;
  allOnPageSelected: boolean;
  onToggle: (employeeId: number) => void;
  onTogglePage: () => void;
  policy: SlipRowPolicy;
  busyFor: (employeeId: number) => RowActionKind | null;
}

const th =
  'border-b border-line bg-bg-subtle px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted select-none sm:px-4 sm:py-3 sm:text-xs 2xl:px-6 2xl:text-sm';
const td = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 2xl:px-6 2xl:py-4';
const checkbox = 'h-4 w-4 cursor-pointer rounded border-line-strong accent-[var(--tt-primary)]';

export function SlipTable({ rows, selected, allOnPageSelected, onToggle, onTogglePage, policy, busyFor, ...handlers }: SlipTableProps) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className={cx(th, 'w-10 pr-0')}>
              <input type="checkbox" aria-label="Select all on this page" checked={allOnPageSelected} onChange={onTogglePage} className={checkbox} />
            </th>
            <th className={th}>Employee</th>
            <th className={cx(th, 'hidden lg:table-cell')}>Site</th>
            <th className={th}>Payslip no.</th>
            <th className={cx(th, 'text-right')}>Net pay</th>
            <th className={th}>Status</th>
            <th className={cx(th, 'text-right')}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = selected.has(row.employeeId);
            return (
              <tr key={row.employeeId} className={cx('transition-colors hover:bg-bg-subtle/50', isSelected && 'bg-bg-subtle/60')}>
                <td className={cx(td, 'w-10 pr-0')}>
                  <input type="checkbox" aria-label={`Select ${row.name}`} checked={isSelected} onChange={() => onToggle(row.employeeId)} className={checkbox} />
                </td>
                <td className={td}>
                  <div className="text-xs font-semibold text-fg sm:text-sm 2xl:text-base">{row.name}</div>
                  <div className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">{row.code || '—'}</div>
                </td>
                <td className={cx(td, 'hidden text-xs text-fg-muted sm:text-sm lg:table-cell')}>{row.site || '—'}</td>
                <td className={cx(td, 'font-mono text-xs text-fg sm:text-[13px]')}>{row.payslipNumber || <span className="font-sans text-fg-subtle">—</span>}</td>
                <td className={cx(td, 'text-right text-xs font-semibold tabular-nums text-fg sm:text-sm 2xl:text-base')}>{money(row.netPay)}</td>
                <td className={td}>
                  <SlipStatusBadge status={row.status} reason={row.holdReason} />
                </td>
                <td className={cx(td, 'text-right')}>
                  <SlipRowActions row={row} policy={policy} busy={busyFor(row.employeeId)} {...handlers} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
