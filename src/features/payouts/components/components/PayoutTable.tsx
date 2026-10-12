'use client';

import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Minus } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { dateText, money } from '@/features/salary-advance/utils/format';
import { STATUS_LABEL } from '../../constants/payouts.constants';
import type { Payout, PayoutFilters, PayoutSortKey, PayoutStatus } from '../../types/payouts.model';

const th = 'border-b border-line bg-bg-subtle px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted select-none sm:px-4 sm:py-3';
const td = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3';

const TONE: Record<PayoutStatus, string> = {
  unpaid: 'border-line-strong bg-surface text-fg',
  paid: 'border-fg/20 bg-fg text-[var(--tt-on-primary)]',
  failed: 'border-[var(--tt-danger)]/25 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]',
};

export function PayoutStatusPill({ status }: { status: PayoutStatus }) {
  return <span className={cx('inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold sm:text-xs', TONE[status])}>{STATUS_LABEL[status]}</span>;
}

export function Checkbox({ checked, partial, onChange, label }: { checked: boolean; partial?: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={partial ? 'mixed' : checked}
      aria-label={label}
      onClick={onChange}
      className={cx('flex h-4 w-4 items-center justify-center rounded border transition-colors', checked || partial ? 'border-fg bg-fg text-[var(--tt-on-primary)]' : 'border-line-strong bg-surface hover:border-fg')}
    >
      {checked ? <Check className="h-3 w-3" /> : partial ? <Minus className="h-3 w-3" /> : null}
    </button>
  );
}

function SortHead({ label, k, sort, onSort, className }: { label: string; k: PayoutSortKey; sort: PayoutFilters['sort']; onSort: (k: PayoutSortKey) => void; className?: string }) {
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

export function sourceHref(row: Payout, area: string) {
  return row.source === 'salary' && row.runId ? `${area}/payroll/${row.runId}/${row.employeeId}` : `${area}/salary-advance/advances/${row.id}`;
}

interface Props {
  rows: Payout[];
  sort: PayoutFilters['sort'];
  onSort: (k: PayoutSortKey) => void;
  selectable: (row: Payout) => boolean;
  selected: Map<string, Payout>;
  onToggle: (row: Payout) => void;
  onTogglePage: (rows: Payout[]) => void;
  area: string;
}

export function PayoutTable({ rows, sort, onSort, selectable, selected, onToggle, onTogglePage, area }: Props) {
  const pickable = rows.filter(selectable);
  const picked = pickable.filter((r) => selected.has(r.key)).length;
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[960px] border-separate border-spacing-0 text-xs sm:text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className={cx(th, 'w-10')}>
              {pickable.length > 0 && (
                <Checkbox checked={picked === pickable.length} partial={picked > 0 && picked < pickable.length} onChange={() => onTogglePage(pickable)} label="Select all on this page" />
              )}
            </th>
            <SortHead label="Employee" k="name" sort={sort} onSort={onSort} />
            <th className={th}>For</th>
            <th className={th}>Company</th>
            <th className={th}>Bank</th>
            <SortHead label="Amount" k="amount" sort={sort} onSort={onSort} className="text-right" />
            <SortHead label="Due" k="due_on" sort={sort} onSort={onSort} />
            <th className={th}>Status</th>
            <SortHead label="Paid" k="paid_on" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const can = selectable(r);
            const on = selected.has(r.key);
            return (
              <tr key={r.key} className={cx('transition-colors hover:bg-bg-subtle/60', on && 'bg-bg-subtle')}>
                <td className={td}>{can && <Checkbox checked={on} onChange={() => onToggle(r)} label={`Select ${r.employeeName}`} />}</td>
                <td className={td}>
                  <div className="font-semibold text-fg">{r.employeeName}</div>
                  <div className="text-[11px] text-fg-muted">{r.employeeCode || '—'}</div>
                </td>
                <td className={td}>
                  <Link href={sourceHref(r, area)} className="font-medium text-fg underline-offset-2 hover:underline">{r.label}</Link>
                  <div className="text-[11px] text-fg-muted">{r.source === 'salary' ? 'Salary' : 'Advance'}</div>
                </td>
                <td className={cx(td, 'text-fg-muted')}>{r.companyName}</td>
                <td className={td}>
                  {r.paymentMode !== 'bank' ? (
                    <span className="text-fg-muted capitalize">{r.paymentMode}</span>
                  ) : r.bank ? (
                    <span className="text-fg">{r.bank}</span>
                  ) : (
                    <span className="font-medium text-[var(--tt-danger)]">No bank details</span>
                  )}
                </td>
                <td className={cx(td, 'text-right font-semibold tabular-nums text-fg')}>{money(r.amount)}</td>
                <td className={cx(td, 'whitespace-nowrap text-fg-muted')}>{dateText(r.dueOn)}</td>
                <td className={td}>
                  <PayoutStatusPill status={r.status} />
                  {r.note && <div className="mt-1 max-w-[14rem] truncate text-[11px] text-[var(--tt-danger)]" title={r.note}>{r.note}</div>}
                </td>
                <td className={cx(td, 'whitespace-nowrap')}>
                  {r.paidOn ? (
                    <>
                      <div className="text-fg">{dateText(r.paidOn)}</div>
                      {r.reference && <div className="max-w-[10rem] truncate text-[11px] text-fg-muted" title={r.reference}>{r.reference}</div>}
                    </>
                  ) : (
                    <span className="text-fg-subtle">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PayoutCardList({ rows, selectable, selected, onToggle, area }: Omit<Props, 'sort' | 'onSort' | 'onTogglePage'>) {
  return (
    <>
      {rows.map((r) => {
        const can = selectable(r);
        return (
          <div key={r.key} className="flex items-start gap-3 px-4 py-3">
            {can && <div className="pt-1"><Checkbox checked={selected.has(r.key)} onChange={() => onToggle(r)} label={`Select ${r.employeeName}`} /></div>}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">{r.employeeName}</p>
                  <Link href={sourceHref(r, area)} className="text-xs text-fg-muted underline-offset-2 hover:underline">{r.label} · {r.companyName}</Link>
                </div>
                <p className="shrink-0 text-sm font-bold tabular-nums text-fg">{money(r.amount)}</p>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">
                <PayoutStatusPill status={r.status} />
                <span>{r.bank || (r.paymentMode !== 'bank' ? r.paymentMode : 'No bank details')}</span>
                {r.paidOn && <span>Paid {dateText(r.paidOn)}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
