'use client';

import { useEffect, useState, useRef } from 'react';
import { AlertTriangle, Search, ChevronDown, Check } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { cx } from '@/theme/tokens';
import { dayText, minutesText, PAGE_SIZE, STATUS, timeText, VIEW_LABEL } from '../constants/dashboard.constants';
import type { DashboardEmployeeDto, EmployeeView, EmployeesResponseDto, SummaryDto } from '../types/dashboard.dto';
import { Avatar } from './Avatar';

function Badge({ status }: { status: DashboardEmployeeDto['status'] }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-bold text-fg">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: STATUS[status].color }} />
      {STATUS[status].short}
    </span>
  );
}

const PRIMARY_VIEWS: EmployeeView[] = ['all', 'present', 'late', 'absent'];
const VIEWS: EmployeeView[] = ['all', 'present', 'working', 'late', 'not_checked_in', 'absent', 'on_leave', 'review'];

function countFor(v: EmployeeView, s: SummaryDto | null) {
  if (!s) return null;
  if (v === 'all') return s.headcount;
  if (v === 'present') return s.present;
  if (v === 'late') return s.late;
  if (v === 'review') return s.review_pending;
  return s.counts[v];
}

/**
 * The people behind a number, in a popup opened from any tile: one tab per question,
 * search, and a table a page at a time.
 */
export function EmployeesDialog({ open, onClose, date, list, summary, isToday, view, onView, search, onSearch, page, onPage, loading }: {
  open: boolean; onClose: () => void; date: string;
  list: EmployeesResponseDto | null; summary: SummaryDto | null; isToday: boolean; view: EmployeeView; onView: (v: EmployeeView) => void;
  search: string; onSearch: (s: string) => void; page: number; onPage: (p: number) => void; loading: boolean;
}) {
  const [term, setTerm] = useState(search);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) setTerm(search); }, [open]);
  useEffect(() => { const t = setTimeout(() => term !== search && onSearch(term), 300); return () => clearTimeout(t); }, [term, search, onSearch]);

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  const views = VIEWS.filter((v) => isToday || v !== 'not_checked_in');
  const secondaryViews = views.filter((v) => !PRIMARY_VIEWS.includes(v));
  const isSecondaryActive = secondaryViews.includes(view);
  const rows = list?.employees ?? [];

  return (
    <Dialog open={open} onClose={onClose} maxWidthClassName="max-w-6xl" title={
      <div className="min-w-0">
        <h2 className="truncate text-base font-bold text-fg">{VIEW_LABEL[view]}</h2>
        <p className="text-xs text-fg-muted">{date ? dayText(date) : ''}{list ? ` · ${list.total} ${list.total === 1 ? 'employee' : 'employees'}` : ''}</p>
      </div>
    }>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Show">
          {PRIMARY_VIEWS.map((v) => {
            const n = countFor(v, summary);
            const active = view === v;
            return (
              <button
                key={v}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => { setMoreOpen(false); onView(v); }}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors',
                  active
                    ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]'
                    : 'border-line text-fg-muted hover:bg-bg-subtle hover:text-fg'
                )}
              >
                {VIEW_LABEL[v]}
                {n !== null && (
                  <span className={cx('rounded px-1 tabular-nums', active ? 'bg-white/20' : 'bg-bg-subtle')}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}

          {secondaryViews.length > 0 && (
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((o) => !o)}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors',
                  isSecondaryActive
                    ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]'
                    : 'border-line text-fg-muted hover:bg-bg-subtle hover:text-fg'
                )}
              >
                <span>{isSecondaryActive ? VIEW_LABEL[view] : 'More Filters'}</span>
                {isSecondaryActive && countFor(view, summary) !== null && (
                  <span className="rounded bg-white/20 px-1 tabular-nums">
                    {countFor(view, summary)}
                  </span>
                )}
                <ChevronDown className={cx('h-3.5 w-3.5 transition-transform duration-150', moreOpen && 'rotate-180')} />
              </button>

              {moreOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[210px] rounded-xl border border-line bg-surface p-1 shadow-[var(--tt-shadow-md)]">
                  {secondaryViews.map((sv) => {
                    const n = countFor(sv, summary);
                    const selected = view === sv;
                    const statusConfig = STATUS[sv as keyof typeof STATUS];
                    return (
                      <button
                        key={sv}
                        type="button"
                        onClick={() => {
                          onView(sv);
                          setMoreOpen(false);
                        }}
                        className={cx(
                          'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors text-left',
                          selected
                            ? 'bg-[var(--tt-primary-subtle)] text-[var(--tt-primary)] font-semibold'
                            : 'text-fg hover:bg-bg-subtle'
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {statusConfig && (
                            <span
                              aria-hidden
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ background: statusConfig.color }}
                            />
                          )}
                          <span>{VIEW_LABEL[sv]}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {n !== null && (
                            <span className="rounded bg-bg-subtle px-1 text-[11px] font-semibold tabular-nums text-fg-muted">
                              {n}
                            </span>
                          )}
                          {selected && <Check className="h-3.5 w-3.5 text-[var(--tt-primary)] shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
          description={view === 'all' ? 'Try another date, sub-organisation or site.' : 'Pick another tab, or widen the filters on the dashboard.'}
          action={search ? { label: 'Clear search', onClick: () => { setTerm(''); onSearch(''); }, variant: 'link' } : undefined} />
      ) : (
        <div className={cx('transition-opacity', loading && 'opacity-60')}>
          {/* One table at every width; narrow screens scroll it sideways. */}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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
                        <Avatar src={e.photo_url} />
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
          <div className="mt-4">
            <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil((list?.total ?? 0) / PAGE_SIZE))} totalItems={list?.total ?? 0} pageSize={PAGE_SIZE} onPageChange={onPage} pageSizeOptions={[PAGE_SIZE]} />
          </div>
        </div>
      )}
    </Dialog>
  );
}
