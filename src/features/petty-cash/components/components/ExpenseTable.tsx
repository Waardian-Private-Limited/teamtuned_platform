'use client';

import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FlagCount } from '@/features/expense-bills/components/Flags';
import type { Expense, ExpenseSortKey } from '../../types/petty-cash.model';
import type { ExpenseSort } from '../../hooks/useExpenseList';
import { dateText, money } from '../../utils/format';
import { ExpenseStatusPill, InwardNos, InwardPill, PhysicalCopyPill } from './StatusBadges';

const checkbox = 'h-4 w-4 cursor-pointer rounded border-line-strong accent-[var(--tt-primary)]';
const th = 'border-b border-line bg-bg-subtle px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted select-none sm:px-4 sm:py-3 2xl:px-6 2xl:text-xs';
const td = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 2xl:px-6';

function SortHead({ label, k, sort, onSort, className }: { label: string; k: ExpenseSortKey; sort: ExpenseSort; onSort?: (k: ExpenseSortKey) => void; className?: string }) {
  // A list the server orders itself (the inward register): a plain heading.
  if (!onSort) return <th className={cx(th, className)}>{label}</th>;
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={cx(th, className)} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(k)} className={cx('inline-flex items-center gap-1 uppercase tracking-wider hover:text-fg', active && 'text-fg')}>
        {label}
        <Icon className={cx('h-3 w-3', !active && 'opacity-50')} aria-hidden />
      </button>
    </th>
  );
}

export interface ExpenseSelection {
  ids: ReadonlySet<number>;
  toggle: (id: number) => void;
  setPage: (ids: number[], on: boolean) => void;
}

interface ExpenseTableProps {
  rows: Expense[];
  sort: ExpenseSort;
  /** Absent: the columns cannot be sorted. */
  onSort?: (k: ExpenseSortKey) => void;
  href: (id: number) => string;
  /** Row checkboxes (bulk inward, export of the picked expenses). */
  selection?: ExpenseSelection;
  /** Show the spender column (HR) or the wallet column instead (the employee's own list). */
  showSpender?: boolean;
  /** Show the inward number column (inward register). */
  showInward?: boolean;
}

/** Desktop table of expenses. Phones use `ExpenseCardList`. */
export function ExpenseTable({ rows, sort, onSort, href, selection, showSpender = true, showInward }: ExpenseTableProps) {
  const pageIds = rows.map((r) => r.id);
  const checkedOnPage = selection ? pageIds.filter((id) => selection.ids.has(id)).length : 0;
  const allChecked = checkedOnPage > 0 && checkedOnPage === pageIds.length;
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            {selection && (
              <th className={cx(th, 'w-10 pr-0 sm:pr-0 2xl:pr-0')}>
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  className={checkbox}
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = checkedOnPage > 0 && !allChecked;
                  }}
                  onChange={() => selection.setPage(pageIds, !allChecked)}
                />
              </th>
            )}
            <SortHead label="Date" k="date" sort={sort} onSort={onSort} />
            <th className={th}>Expense</th>
            <th className={cx(th, 'hidden lg:table-cell')}>{showSpender ? 'Spent by' : 'Wallet'}</th>
            <SortHead label="Amount" k="amount" sort={sort} onSort={onSort} className="text-right" />
            <th className={th}>Status</th>
            {showInward ? <SortHead label="Goods inward" k="inward" sort={sort} onSort={onSort} /> : <th className={cx(th, 'hidden xl:table-cell')}>Paper bill</th>}
            <th className={cx(th, 'text-right')}>
              <span className="sr-only">View</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={cx('group transition-colors hover:bg-bg-subtle/50', selection?.ids.has(r.id) && 'bg-bg-subtle/60', (r.status === 'cancelled' || r.status === 'rejected') && 'opacity-60')}>
              {selection && (
                <td className={cx(td, 'w-10 pr-0 sm:pr-0 2xl:pr-0')}>
                  <input type="checkbox" aria-label={`Select ${r.number}`} className={checkbox} checked={selection.ids.has(r.id)} onChange={() => selection.toggle(r.id)} />
                </td>
              )}
              <td className={cx(td, 'whitespace-nowrap text-xs text-fg-muted sm:text-sm')}>{dateText(r.expenseDate)}</td>
              <td className={cx(td, 'max-w-[20rem]')}>
                <Link href={href(r.id)} className="block min-w-0">
                  <div className="truncate text-xs font-semibold text-fg sm:text-sm">{r.merchant || r.description || r.category.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-fg-muted">
                    <span className="truncate">{[r.number, r.category.name, r.site?.name].filter(Boolean).join(' · ')}</span>
                    <FlagCount count={r.flags.length} />
                  </div>
                </Link>
              </td>
              <td className={cx(td, 'hidden lg:table-cell')}>
                {showSpender ? (
                  <>
                    <div className="truncate text-xs text-fg sm:text-sm">{r.spender.name}</div>
                    <div className="mt-0.5 truncate text-[11px] text-fg-muted">{[r.spender.code, r.wallet.name].filter(Boolean).join(' · ')}</div>
                  </>
                ) : (
                  <div className="truncate text-xs text-fg sm:text-sm">{r.wallet.name}</div>
                )}
              </td>
              <td className={cx(td, 'text-right')}>
                <div className="text-xs font-semibold tabular-nums text-fg sm:text-sm">{money(r.netAmount)}</div>
                {r.approvedAmount !== null && r.approvedAmount < r.amount && <div className="mt-0.5 text-[11px] tabular-nums text-fg-muted line-through">{money(r.amount)}</div>}
              </td>
              <td className={td}>
                <ExpenseStatusPill status={r.status} />
              </td>
              {showInward ? (
                <td className={td}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {r.inward.status !== 'received' && <InwardPill inward={r.inward} />}
                    <InwardNos numbers={r.inward.numbers} />
                  </div>
                </td>
              ) : (
                <td className={cx(td, 'hidden xl:table-cell')}>
                  <PhysicalCopyPill copy={r.physicalCopy} />
                </td>
              )}
              <td className={cx(td, 'text-right')}>
                <Link href={href(r.id)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle">
                  View
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
