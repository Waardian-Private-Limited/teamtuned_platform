'use client';

import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { PAYOUT_MODE_LABEL } from '../../constants/reimbursement.constants';
import type { Claim, ClaimSort, ClaimSortKey } from '../../types/reimbursement.model';
import { dateText, money } from '../../utils/format';
import { ChannelBadge, ClaimStatusPill, FlagCount } from './StatusBadges';
import { PhysicalCopyPill } from './PaperBill';

const checkbox = 'h-4 w-4 cursor-pointer rounded border-line-strong accent-[var(--tt-primary)]';

const th = 'border-b border-line bg-bg-subtle px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted select-none sm:px-4 sm:py-3 2xl:px-6 2xl:text-xs';
const td = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 2xl:px-6';

function SortHead({ label, k, sort, onSort, className }: { label: string; k: ClaimSortKey; sort: ClaimSort; onSort: (k: ClaimSortKey) => void; className?: string }) {
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

interface ClaimTableProps {
  rows: Claim[];
  sort: ClaimSort;
  onSort: (k: ClaimSortKey) => void;
  href: (id: number) => string;
  showChannel: boolean;
  /** Row checkboxes (bulk paper-bill collection, export of the selected reports). */
  selection?: { ids: ReadonlySet<number>; toggle: (id: number) => void; setPage: (ids: number[], on: boolean) => void };
}

export function ClaimTable({ rows, sort, onSort, href, showChannel, selection }: ClaimTableProps) {
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
            <SortHead label="Employee" k="name" sort={sort} onSort={onSort} />
            <th className={th}>Expense</th>
            <SortHead label="Amount" k="amount" sort={sort} onSort={onSort} className="text-right" />
            <SortHead label="Submitted" k="submitted_at" sort={sort} onSort={onSort} className="hidden lg:table-cell" />
            <th className={cx(th, 'hidden xl:table-cell')}>Paid back</th>
            <th className={th}>Status</th>
            <th className={th}>Paper bill</th>
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
              <td className={td}>
                <Link href={href(r.id)} className="block min-w-0">
                  <div className="truncate text-xs font-semibold text-fg sm:text-sm">{r.employee.name}</div>
                  <div className="mt-0.5 truncate text-[11px] text-fg-muted sm:text-xs">{[r.employee.code, r.employee.department].filter(Boolean).join(' · ') || '—'}</div>
                </Link>
              </td>
              <td className={cx(td, 'max-w-[18rem]')}>
                <div className="truncate text-xs text-fg sm:text-sm">{r.title}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-fg-muted">
                  <span className="truncate">{[r.number, r.categories.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}</span>
                  <FlagCount count={r.flagCount} />
                </div>
              </td>
              <td className={cx(td, 'text-right')}>
                <div className="text-xs font-semibold tabular-nums text-fg sm:text-sm">{money(r.amount)}</div>
                {r.approvedAmount !== null && r.approvedAmount < r.claimedAmount && <div className="mt-0.5 text-[11px] tabular-nums text-fg-muted line-through">{money(r.claimedAmount)}</div>}
              </td>
              <td className={cx(td, 'hidden text-xs text-fg-muted sm:text-sm lg:table-cell')}>{dateText(r.submittedAt || r.createdAt)}</td>
              <td className={cx(td, 'hidden text-xs text-fg-muted sm:text-sm xl:table-cell')}>
                {r.channel === 'wallet' ? '—' : r.status === 'paid' ? dateText(r.paidOn) : r.payoutMode ? PAYOUT_MODE_LABEL[r.payoutMode] : '—'}
              </td>
              <td className={td}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ClaimStatusPill status={r.status} channel={r.channel} />
                  {showChannel && <ChannelBadge channel={r.channel} />}
                </div>
              </td>
              <td className={td}>
                <PhysicalCopyPill copy={r.physicalCopy} />
              </td>
              <td className={cx(td, 'text-right')}>
                <Link href={href(r.id)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle">
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
