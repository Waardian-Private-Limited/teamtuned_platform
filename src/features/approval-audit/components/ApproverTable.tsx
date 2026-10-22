'use client';

import React from 'react';
import { ShieldCheck, UserRound } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Card, Skeleton } from '@/features/attendance-dashboard/components/Card';
import { Field, SortTh, Tag, sortRows, td } from './parts';
import type { SortState } from './parts';
import { isSlow } from './GroupTable';
import { durationText } from '../utils/format';
import type { AuditApproverDto, Durations } from '../types/audit.dto';

type Key = 'name' | 'pending' | 'overdue' | 'oldest' | 'decided' | 'median' | 'p90' | 'late' | 'escalated';

const value = (r: AuditApproverDto, k: Key): number | string | null => {
  switch (k) {
    case 'name': return r.name;
    case 'oldest': return r.oldest_minutes;
    case 'median': return r.response.median;
    case 'p90': return r.response.p90;
    default: return r[k];
  }
};

/**
 * Each approver (a person, or "anyone with a permission" when a step is open to a permission):
 * what waits on them now, what they decided in the period and how fast, decisions made after
 * the due time, and tasks escalated away. A row lists the requests waiting on them.
 */
export function ApproverTable({ approvers, overall, loading, active, onPick }: { approvers: AuditApproverDto[] | null; overall: Durations | null; loading: boolean; active: string | null; onPick: (a: AuditApproverDto) => void }) {
  const [sort, setSort] = React.useState<SortState<Key>>({ key: 'pending', dir: 'desc' });
  const rows = approvers ? sortRows(approvers, sort, value) : [];
  const Icon = (r: AuditApproverDto) => (r.kind === 'employee' ? UserRound : ShieldCheck);
  const slow = (r: AuditApproverDto) => isSlow(r.response.median, overall);

  return (
    <Card title="Approvers" subtitle="Waiting on them now · decided in the period, task opened to acted">
      {loading || !approvers ? <Skeleton className="h-48 w-full" /> : rows.length === 0 ? (
        <p className="flex h-32 items-center justify-center text-sm text-fg-muted">No approver activity in this period.</p>
      ) : (
        <>
          <div className="-mx-4 hidden max-h-[480px] overflow-auto sm:-mx-5 md:block">
            <table className="w-full min-w-[820px] border-collapse">
              <thead className="sticky top-0 z-[1] border-y border-line bg-bg-subtle">
                <tr>
                  <SortTh label="Approver" k="name" sort={sort} onSort={setSort} numeric={false} className="pl-5" />
                  <SortTh label="Pending" k="pending" sort={sort} onSort={setSort} />
                  <SortTh label="Past due" k="overdue" sort={sort} onSort={setSort} />
                  <SortTh label="Oldest" k="oldest" sort={sort} onSort={setSort} />
                  <SortTh label="Decided" k="decided" sort={sort} onSort={setSort} />
                  <SortTh label="Median reply" k="median" sort={sort} onSort={setSort} />
                  <SortTh label="Slowest 10%" k="p90" sort={sort} onSort={setSort} />
                  <SortTh label="Late" k="late" sort={sort} onSort={setSort} />
                  <SortTh label="Escalated" k="escalated" sort={sort} onSort={setSort} className="pr-5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const I = Icon(r);
                  return (
                    <tr key={r.key} onClick={() => { if (r.pending) onPick(r); }} aria-selected={active === r.key}
                      className={cx('border-b border-line last:border-b-0', r.pending > 0 && 'cursor-pointer hover:bg-bg-subtle', active === r.key && 'bg-bg-subtle')}>
                      <td className={cx(td, 'max-w-[280px] pl-5')}>
                        <span className="flex min-w-0 items-center gap-2"><I aria-hidden className="h-4 w-4 shrink-0 text-fg-muted" /><span className="truncate font-semibold">{r.name}</span></span>
                      </td>
                      <td className={cx(td, 'text-right', r.pending ? 'font-bold' : 'text-fg-muted')}>{r.pending}</td>
                      <td className={cx(td, 'text-right')}>{r.overdue ? <Tag solid>{r.overdue}</Tag> : <span className="text-fg-muted">0</span>}</td>
                      <td className={cx(td, 'text-right text-fg-muted')}>{durationText(r.oldest_minutes)}</td>
                      <td className={cx(td, 'text-right')}>{r.decided}<span className="ml-1 text-xs text-fg-muted">({r.approved}/{r.rejected})</span></td>
                      <td className={cx(td, 'text-right', slow(r) ? 'font-extrabold' : 'text-fg-muted')}>
                        <span className="inline-flex items-center gap-1.5">{slow(r) && <Tag>Slow</Tag>}{durationText(r.response.median)}</span>
                      </td>
                      <td className={cx(td, 'text-right text-fg-muted')}>{durationText(r.response.p90)}</td>
                      <td className={cx(td, 'text-right', r.late ? 'font-bold' : 'text-fg-muted')}>{r.late}</td>
                      <td className={cx(td, 'pr-5 text-right', r.escalated ? 'font-bold' : 'text-fg-muted')}>{r.escalated}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-2 md:hidden">
            {rows.map((r) => {
              const I = Icon(r);
              return (
                <li key={r.key}>
                  <button type="button" disabled={!r.pending} onClick={() => onPick(r)} className={cx('w-full rounded-lg border p-3 text-left transition-colors disabled:cursor-default', active === r.key ? 'border-[var(--tt-primary)]' : 'border-line hover:border-line-strong')}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2"><I aria-hidden className="h-4 w-4 shrink-0 text-fg-muted" /><span className="truncate text-sm font-bold text-fg">{r.name}</span></span>
                      <span className="flex shrink-0 gap-1">{slow(r) && <Tag>Slow</Tag>}{r.overdue > 0 && <Tag solid>{r.overdue} past due</Tag>}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      <Field label="Pending">{r.pending}</Field>
                      <Field label="Decided">{r.decided}</Field>
                      <Field label="Median">{durationText(r.response.median)}</Field>
                      <Field label="Late">{r.late}</Field>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
