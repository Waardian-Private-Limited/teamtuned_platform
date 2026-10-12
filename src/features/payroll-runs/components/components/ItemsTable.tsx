'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import type { ItemFilters, ItemSortKey, PayItem } from '../../types/payrollRuns.model';
import { days, lateDeductionTip, money } from '../../utils/format';
import { Avatar, ItemStatusPill, PayslipStatePill } from './controls';

const th = 'border-b border-line bg-bg-subtle px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted select-none sm:px-4 2xl:text-xs';
const td = 'border-b border-line/60 px-3.5 py-2.5 text-xs text-fg sm:px-4 sm:text-sm';

function SortHead({ label, k, filters, onSort, className }: { label: string; k: ItemSortKey; filters: ItemFilters; onSort: (k: ItemSortKey) => void; className?: string }) {
  const active = filters.sort === k;
  const Icon = !active ? ArrowUpDown : filters.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={cx(th, className)} aria-sort={active ? (filters.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(k)} className={cx('inline-flex items-center gap-1 uppercase tracking-wider hover:text-fg', active && 'text-fg')}>
        {label}
        <Icon className={cx('h-3 w-3', !active && 'opacity-50')} />
      </button>
    </th>
  );
}

function LateNote({ item, align }: { item: PayItem; align: 'start' | 'end' }) {
  const ld = item.lateDeduction;
  if (!ld || ld.days <= 0) return null;
  return (
    <Tooltip content={lateDeductionTip(ld)} side="top" align={align}>
      <span className="inline-flex items-center rounded border border-line px-1 py-px text-[10px] font-semibold leading-tight text-fg-muted">
        incl. {days(ld.days)} late
      </span>
    </Tooltip>
  );
}

export function StatusMark({ item }: { item: PayItem }) {
  if (item.status === 'ok') return null;
  const tip = item.status === 'held' ? `On hold${item.holdReason ? `: ${item.holdReason}` : ''}` : item.warnings[0]?.message || null;
  const more = item.status !== 'held' && item.warnings.length > 1 ? ` (+${item.warnings.length - 1} more)` : '';
  return (
    <Tooltip content={tip ? `${tip.length > 90 ? `${tip.slice(0, 90)}…` : tip}${more}` : null} side="right">
      <ItemStatusPill status={item.status} />
    </Tooltip>
  );
}

interface ItemsTableProps {
  items: PayItem[];
  filters: ItemFilters;
  onSort: (k: ItemSortKey) => void;
  onView: (item: PayItem) => void;
}

function hasPayslipState(items: PayItem[]) {
  return items.some((it) => it.payslipState !== null && it.payslipState !== 'draft');
}

export function ItemsTable({ items, filters, onSort, onView }: ItemsTableProps) {
  const showPayslip = hasPayslipState(items);
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[820px] border-separate border-spacing-0">
        <thead className="sticky top-0 z-10">
          <tr>
            <SortHead label="Name" k="name" filters={filters} onSort={onSort} />
            <th className={th}>Site</th>
            <th className={cx(th, 'text-right')}>Cycle days</th>
            <SortHead label="Payable days" k="payable_days" filters={filters} onSort={onSort} className="text-right" />
            <SortHead label="LOP days" k="lop_days" filters={filters} onSort={onSort} className="text-right" />
            <th className={cx(th, 'text-right')}>Leaves</th>
            <SortHead label="Net pay" k="net_pay" filters={filters} onSort={onSort} className="text-right" />
            {showPayslip && <th className={th}>Payslip</th>}
            <th className={cx(th, 'w-24 text-right')}>
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="transition-colors hover:bg-bg-subtle/50">
              <td className={td}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={it.employee.name} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-semibold text-fg">{it.employee.name}</span>
                      <StatusMark item={it} />
                    </div>
                    <p className="truncate text-[11px] text-fg-muted">
                      {[it.employee.code, it.department].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                </div>
              </td>
              <td className={cx(td, 'max-w-[12rem] truncate text-fg-muted')}>{it.site || '—'}</td>
              <td className={cx(td, 'text-right tabular-nums text-fg-muted')}>{days(it.cycleDays)}</td>
              <td className={cx(td, 'text-right font-semibold tabular-nums')}>{days(it.payableDays)}</td>
              <td className={cx(td, 'text-right tabular-nums')}>
                <span className={cx('block', it.lopDays > 0 ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg-muted')}>{days(it.lopDays)}</span>
                <LateNote item={it} align="end" />
              </td>
              <td className={cx(td, 'text-right tabular-nums text-fg-muted')}>{days(it.leaveDays)}</td>
              <td className={cx(td, 'text-right font-bold tabular-nums', it.status === 'held' && 'text-fg-muted line-through decoration-fg-subtle')}>{money(it.netPay)}</td>
              {showPayslip && (
                <td className={td}>
                  <PayslipStatePill state={it.payslipState} />
                </td>
              )}
              <td className={cx(td, 'text-right')}>
                <button
                  type="button"
                  onClick={() => onView(it)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-line px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle"
                >
                  View <ChevronRight className="h-3.5 w-3.5 text-fg-muted" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ItemCardList({ items, onView }: { items: PayItem[]; onView: (item: PayItem) => void }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((it) => (
        <li key={it.id}>
          <button type="button" onClick={() => onView(it)} className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-bg-subtle/60">
            <Avatar name={it.employee.name} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">{it.employee.name}</p>
                  <p className="truncate text-[11px] text-fg-muted">{[it.employee.code, it.site].filter(Boolean).join(' · ') || '—'}</p>
                </div>
                <p className={cx('shrink-0 text-sm font-bold tabular-nums text-fg', it.status === 'held' && 'text-fg-muted line-through')}>{money(it.netPay)}</p>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-muted">
                <span>
                  Payable <span className="font-semibold text-fg tabular-nums">{days(it.payableDays)}</span>/{days(it.cycleDays)}
                </span>
                <span>
                  LOP <span className={cx('font-semibold tabular-nums', it.lopDays > 0 ? 'text-[var(--tt-danger)]' : 'text-fg')}>{days(it.lopDays)}</span>
                </span>
                <LateNote item={it} align="start" />
                <span>
                  Leaves <span className="font-semibold tabular-nums text-fg">{days(it.leaveDays)}</span>
                </span>
                {it.status !== 'ok' && <ItemStatusPill status={it.status} />}
                {it.payslipState !== 'held' && <PayslipStatePill state={it.payslipState} />}
              </div>
              {it.status !== 'ok' && (it.warnings[0] || it.holdReason) && (
                <p className={cx('mt-1 line-clamp-1 text-[11px]', it.status === 'error' ? 'text-[var(--tt-danger)]' : 'text-fg-muted')}>
                  {it.status === 'held' ? it.holdReason : it.warnings[0]?.message}
                </p>
              )}
            </div>
            <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-fg-subtle" />
          </button>
        </li>
      ))}
    </ul>
  );
}
