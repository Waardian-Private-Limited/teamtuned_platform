'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Search, UserRound } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { cx } from '@/theme/tokens';
import { minutesText, PAGE_SIZE, STATUS, timeText, VIEW_LABEL } from '../constants/dashboard.constants';
import type { DashboardEmployeeDto, EmployeeView, EmployeesResponseDto, SummaryDto } from '../types/dashboard.dto';
import { Card } from './Card';

function Badge({ status }: { status: DashboardEmployeeDto['status'] }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-bold text-fg">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: STATUS[status].color }} />
      {STATUS[status].short}
    </span>
  );
}

function Avatar({ e }: { e: DashboardEmployeeDto }) {
  return e.photo_url
    ? <img src={e.photo_url} alt="" className="h-9 w-9 shrink-0 rounded-full border border-line object-cover" loading="lazy" />
    : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-bg-subtle text-fg-muted"><UserRound className="h-4 w-4" /></span>;
}

const VIEWS: EmployeeView[] = ['all', 'present', 'working', 'late', 'not_checked_in', 'absent', 'on_leave', 'review'];

function countFor(v: EmployeeView, s: SummaryDto | null) {
  if (!s) return null;
  if (v === 'all') return s.headcount;
  if (v === 'present') return s.present;
  if (v === 'late') return s.late;
  if (v === 'review') return s.review_pending;
  return s.counts[v];
}

/** The people behind the numbers: one tab per question, search, and a page at a time. */
export function EmployeesPanel({ list, summary, isToday, view, onView, search, onSearch, page, onPage, loading, onReset }: {
  list: EmployeesResponseDto | null; summary: SummaryDto | null; isToday: boolean; view: EmployeeView; onView: (v: EmployeeView) => void;
  search: string; onSearch: (s: string) => void; page: number; onPage: (p: number) => void; loading: boolean; onReset: () => void;
}) {
  const [term, setTerm] = useState(search);
  useEffect(() => { const t = setTimeout(() => term !== search && onSearch(term), 300); return () => clearTimeout(t); }, [term, search, onSearch]);
  const views = VIEWS.filter((v) => isToday || v !== 'not_checked_in');
  const rows = list?.employees ?? [];

  return (
    <Card title="Employees" subtitle={VIEW_LABEL[view]}>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Show">
          {views.map((v) => {
            const n = countFor(v, summary);
            return (
              <button key={v} role="tab" aria-selected={view === v} type="button" onClick={() => onView(v)}
                className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors', view === v ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line text-fg-muted hover:bg-bg-subtle hover:text-fg')}>
                {VIEW_LABEL[v]}
                {n !== null && <span className={cx('rounded px-1 tabular-nums', view === v ? 'bg-white/20' : 'bg-bg-subtle')}>{n}</span>}
              </button>
            );
          })}
        </div>
        <label className="relative w-full lg:w-64">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search name or code" aria-label="Search employees"
            className="h-9 w-full rounded-[var(--tt-radius-control)] border border-line bg-surface pl-9 pr-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-[var(--tt-primary)]" />
        </label>
      </div>

      {loading && !list ? <TableSkeleton rows={6} columns={5} /> : rows.length === 0 ? (
        <EmptyState
          illustration={{ src: '/vectors/attendancedashboard.svg', width: 220, height: 160, alt: 'No employees' }}
          title={search ? `No one matches “${search}”` : `No one in “${VIEW_LABEL[view]}”`}
          description={view === 'all' ? 'Try another date, sub-organisation or site.' : 'Pick another tab or widen the filters.'}
          action={{ label: 'Reset filters', onClick: onReset, variant: 'link' }} />
      ) : (
        <div className={cx('transition-opacity', loading && 'opacity-60')}>
          {/* Table from tablet up; stacked cards on phones. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                  <th className="px-2 pb-2">Employee</th><th className="px-2 pb-2">Status</th><th className="px-2 pb-2">Site</th>
                  <th className="px-2 pb-2 text-right">In</th><th className="px-2 pb-2 text-right">Out</th><th className="px-2 pb-2 text-right">Worked</th><th className="px-2 pb-2 text-right">Late by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((e) => (
                  <tr key={e.employee_id} className="hover:bg-bg-subtle/60">
                    <td className="px-2 py-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar e={e} />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-fg">{e.name}</p>
                          <p className="truncate text-xs text-fg-muted">{[e.employee_code, e.department, e.role].filter(Boolean).join(' · ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge status={e.status} />
                        {e.review_pending && <span title="Needs review" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--tt-warning)]"><AlertTriangle className="h-3.5 w-3.5" />Review</span>}
                      </div>
                    </td>
                    <td className="max-w-[10rem] truncate px-2 py-2.5 text-fg-muted">{e.site || '—'}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-fg">{timeText(e.first_in_at)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-fg">{timeText(e.last_out_at)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-fg">{e.worked_minutes ? minutesText(e.worked_minutes) : '—'}</td>
                    <td className={cx('px-2 py-2.5 text-right tabular-nums', e.late ? 'font-bold text-[var(--tt-danger)]' : 'text-fg-muted')}>{e.late ? minutesText(e.late_minutes) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
            {rows.map((e) => (
              <li key={e.employee_id} className="rounded-lg border border-line p-3">
                <div className="flex items-center gap-3">
                  <Avatar e={e} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-fg">{e.name}</p>
                    <p className="truncate text-xs text-fg-muted">{[e.employee_code, e.site].filter(Boolean).join(' · ')}</p>
                  </div>
                  <Badge status={e.status} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div><p className="text-fg-muted">In</p><p className="font-bold tabular-nums text-fg">{timeText(e.first_in_at)}</p></div>
                  <div><p className="text-fg-muted">Out</p><p className="font-bold tabular-nums text-fg">{timeText(e.last_out_at)}</p></div>
                  <div><p className="text-fg-muted">{e.late ? 'Late by' : 'Worked'}</p><p className={cx('font-bold tabular-nums', e.late ? 'text-[var(--tt-danger)]' : 'text-fg')}>{e.late ? minutesText(e.late_minutes) : e.worked_minutes ? minutesText(e.worked_minutes) : '—'}</p></div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil((list?.total ?? 0) / PAGE_SIZE))} totalItems={list?.total ?? 0} pageSize={PAGE_SIZE} onPageChange={onPage} pageSizeOptions={[PAGE_SIZE]} />
          </div>
        </div>
      )}
    </Card>
  );
}
