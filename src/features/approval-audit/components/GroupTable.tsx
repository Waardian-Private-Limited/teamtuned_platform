'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Card, Skeleton } from '@/features/attendance-dashboard/components/Card';
import { Field, SortTh, Tag, sortRows, td, th } from './parts';
import type { SortState } from './parts';
import { durationText, pctText } from '../utils/format';
import type { AuditGroupDto, Durations } from '../types/audit.dto';

export type GroupDim = 'type' | 'site' | 'department';
type Key = 'name' | 'raised' | 'approval_rate' | 'median' | 'p90' | 'pending' | 'overdue' | 'oldest';

const DIMS: ReadonlyArray<{ value: GroupDim; label: string; empty: string; none: string }> = [
  { value: 'type', label: 'By type', empty: 'No requests', none: 'Unknown type' },
  { value: 'site', label: 'By site', empty: 'No requests', none: 'No site' },
  { value: 'department', label: 'By department', empty: 'No requests', none: 'No department' },
];

const value = (r: AuditGroupDto, k: Key): number | string | null => {
  switch (k) {
    case 'name': return r.name ?? '';
    case 'median': return r.turnaround.median;
    case 'p90': return r.turnaround.p90;
    case 'oldest': return r.oldest_minutes;
    default: return r[k];
  }
};

/**
 * Slow means the group's median decision takes at least twice the overall median (with an
 * hour as the floor, so a fast organisation does not flag every minute). Shown by ink weight.
 */
export function isSlow(median: number | null, overall: Durations | null) {
  if (median === null || !overall || overall.median === null) return false;
  return median >= Math.max(overall.median, 60) * 2;
}

/**
 * Outcomes, speed and backlog side by side for each request type, site or department.
 * Sortable; a row narrows the whole page to that group.
 */
export function GroupTable({ groups, overall, loading, onPick }: {
  groups: Record<GroupDim, AuditGroupDto[]> | null;
  overall: Durations | null;
  loading: boolean;
  onPick: (dim: GroupDim, id: string | number) => void;
}) {
  const [dim, setDim] = React.useState<GroupDim>('site');
  const [sort, setSort] = React.useState<SortState<Key>>({ key: 'pending', dir: 'desc' });
  const meta = DIMS.find((d) => d.value === dim)!;
  const rows = groups ? sortRows(groups[dim], sort, value) : [];

  const tabs = (
    <div role="tablist" aria-label="Group by" className="flex gap-1 rounded-lg border border-line bg-bg-subtle p-1">
      {DIMS.map((d) => (
        <button key={d.value} type="button" role="tab" aria-selected={dim === d.value} onClick={() => setDim(d.value)}
          className={cx('h-7 rounded-md px-2.5 text-xs font-semibold transition-colors', dim === d.value ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg')}>
          {d.label}
        </button>
      ))}
    </div>
  );

  const name = (r: AuditGroupDto) => r.name || meta.none;
  const slow = (r: AuditGroupDto) => isSlow(r.turnaround.median, overall);

  return (
    <Card title="Where approvals stand" subtitle="Raised and decided in the period · pending now" action={tabs}>
      {loading || !groups ? <Skeleton className="h-48 w-full" /> : rows.length === 0 ? (
        <p className="flex h-32 items-center justify-center text-sm text-fg-muted">No requests in this period.</p>
      ) : (
        <>
          <div className="-mx-4 hidden overflow-x-auto sm:-mx-5 md:block">
            <table className="w-full min-w-[760px] border-collapse">
              <thead className="border-y border-line bg-bg-subtle">
                <tr>
                  <SortTh label={DIMS.find((d) => d.value === dim)!.label.replace('By ', '')} k="name" sort={sort} onSort={setSort} numeric={false} className="pl-5" />
                  <SortTh label="Raised" k="raised" sort={sort} onSort={setSort} />
                  <SortTh label="Approved" k="approval_rate" sort={sort} onSort={setSort} />
                  <SortTh label="Median" k="median" sort={sort} onSort={setSort} />
                  <SortTh label="Slowest 10%" k="p90" sort={sort} onSort={setSort} />
                  <SortTh label="Pending" k="pending" sort={sort} onSort={setSort} />
                  <SortTh label="Past due" k="overdue" sort={sort} onSort={setSort} />
                  <SortTh label="Oldest" k="oldest" sort={sort} onSort={setSort} />
                  <th className={cx(th, 'w-8 pr-5')}><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pick = r.id !== null ? () => onPick(dim, r.id as string | number) : undefined;
                  return (
                    <tr key={String(r.id)} onClick={pick} className={cx('border-b border-line last:border-b-0', pick && 'cursor-pointer hover:bg-bg-subtle')}>
                      <td className={cx(td, 'max-w-[260px] truncate pl-5 font-semibold')}>{name(r)}</td>
                      <td className={cx(td, 'text-right')}>{r.raised}</td>
                      <td className={cx(td, 'text-right')}>{pctText(r.approval_rate)}</td>
                      <td className={cx(td, 'text-right', slow(r) ? 'font-extrabold' : 'text-fg-muted')}>
                        <span className="inline-flex items-center gap-1.5">{slow(r) && <Tag>Slow</Tag>}{durationText(r.turnaround.median)}</span>
                      </td>
                      <td className={cx(td, 'text-right text-fg-muted')}>{durationText(r.turnaround.p90)}</td>
                      <td className={cx(td, 'text-right', r.pending ? 'font-bold' : 'text-fg-muted')}>{r.pending}</td>
                      <td className={cx(td, 'text-right')}>{r.overdue ? <Tag solid>{r.overdue}</Tag> : <span className="text-fg-muted">0</span>}</td>
                      <td className={cx(td, 'text-right text-fg-muted')}>{durationText(r.oldest_minutes)}</td>
                      <td className={cx(td, 'pr-5 text-fg-muted')}>{pick && <ChevronRight className="h-4 w-4" />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-2 md:hidden">
            {rows.map((r) => (
              <li key={String(r.id)}>
                <button type="button" disabled={r.id === null} onClick={() => r.id !== null && onPick(dim, r.id)} className="w-full rounded-lg border border-line p-3 text-left transition-colors hover:border-line-strong disabled:cursor-default">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold text-fg">{name(r)}</span>
                    <span className="flex shrink-0 gap-1">{slow(r) && <Tag>Slow</Tag>}{r.overdue > 0 && <Tag solid>{r.overdue} past due</Tag>}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    <Field label="Raised">{r.raised}</Field>
                    <Field label="Approved">{pctText(r.approval_rate)}</Field>
                    <Field label="Median">{durationText(r.turnaround.median)}</Field>
                    <Field label="Pending">{r.pending}</Field>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
