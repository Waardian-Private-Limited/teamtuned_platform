'use client';

import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { KIND_LABEL } from '../../constants/salaryAdvance.constants';
import type { Advance, AdvanceSort, AdvanceSortKey } from '../../types/salaryAdvance.model';
import { dateText, money, monthLabel } from '../../utils/format';
import { AdvanceStatusPill, RecoveryProgress } from './StatusBadges';

const th =
  'border-b border-line bg-bg-subtle px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted select-none sm:px-4 sm:py-3 2xl:px-6 2xl:text-xs';
const td = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 2xl:px-6';

function SortHead({ label, k, sort, onSort, className }: { label: string; k: AdvanceSortKey; sort: AdvanceSort; onSort: (k: AdvanceSortKey) => void; className?: string }) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={cx(th, className)} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(k)} className={cx('inline-flex items-center gap-1 uppercase tracking-wider hover:text-fg', active && 'text-fg')}>
        {label}
        <Icon className={cx('h-3 w-3', !active && 'opacity-50')} />
      </button>
    </th>
  );
}

export function RecoveryCell({ row }: { row: Advance }) {
  if (row.status === 'pending' || row.status === 'approved' || row.status === 'rejected' || row.status === 'cancelled') {
    return <span className="text-xs text-fg-subtle">Not paid out yet</span>;
  }
  return (
    <div className="min-w-[9rem]">
      <div className="flex items-baseline justify-between gap-2 text-[11px] sm:text-xs">
        <span className="font-semibold tabular-nums text-fg">{money(row.recovered)}</span>
        <span className="tabular-nums text-fg-muted">{money(row.outstanding)} left</span>
      </div>
      <RecoveryProgress progress={row.progress} className="mt-1.5" />
    </div>
  );
}

interface AdvanceTableProps {
  rows: Advance[];
  sort: AdvanceSort;
  onSort: (k: AdvanceSortKey) => void;
  detailHref: (id: number) => string;
}

export function AdvanceTable({ rows, sort, onSort, detailHref }: AdvanceTableProps) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <SortHead label="Employee" k="name" sort={sort} onSort={onSort} />
            <SortHead label="Type" k="created_at" sort={sort} onSort={onSort} />
            <SortHead label="Amount" k="amount" sort={sort} onSort={onSort} className="text-right" />
            <th className={cx(th, 'hidden lg:table-cell')}>Instalments</th>
            <th className={th}>Recovered / outstanding</th>
            <th className={cx(th, 'hidden xl:table-cell')}>Next due</th>
            <SortHead label="Status" k="status" sort={sort} onSort={onSort} />
            <th className={cx(th, 'text-right')}>
              <span className="sr-only">View</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={cx('group transition-colors hover:bg-bg-subtle/50', (row.status === 'cancelled' || row.status === 'rejected') && 'opacity-60')}>
              <td className={td}>
                <Link href={detailHref(row.id)} className="block min-w-0">
                  <div className="truncate text-xs font-semibold text-fg sm:text-sm">{row.employeeName}</div>
                  <div className="mt-0.5 truncate text-[11px] text-fg-muted sm:text-xs">
                    {[row.employeeCode, row.department, row.site].filter(Boolean).join(' · ') || '—'}
                  </div>
                </Link>
              </td>
              <td className={td}>
                <div className="text-xs text-fg sm:text-sm">{row.typeName}</div>
                <div className="mt-0.5 text-[11px] text-fg-muted">{KIND_LABEL[row.kind]} · {dateText(row.createdAt)}</div>
              </td>
              <td className={cx(td, 'text-right')}>
                <div className="text-xs font-semibold tabular-nums text-fg sm:text-sm">{money(row.amount)}</div>
                {row.interestAmount > 0 && <div className="mt-0.5 text-[11px] tabular-nums text-fg-muted">+{money(row.interestAmount)} interest</div>}
              </td>
              <td className={cx(td, 'hidden text-xs tabular-nums text-fg-muted sm:text-sm lg:table-cell')}>
                {row.installments} × {money(row.installmentAmount)}
              </td>
              <td className={td}>
                <RecoveryCell row={row} />
              </td>
              <td className={cx(td, 'hidden text-xs sm:text-sm xl:table-cell')}>
                {row.nextDue ? (
                  <>
                    <div className="font-semibold tabular-nums text-fg">{money(row.nextDue.amount)}</div>
                    <div className="mt-0.5 text-[11px] text-fg-muted">{monthLabel(row.nextDue.month, 'short')}</div>
                  </>
                ) : (
                  <span className="text-fg-subtle">—</span>
                )}
              </td>
              <td className={td}>
                <AdvanceStatusPill status={row.status} />
              </td>
              <td className={cx(td, 'text-right')}>
                <Link
                  href={detailHref(row.id)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle"
                >
                  View
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
