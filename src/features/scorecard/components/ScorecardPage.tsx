'use client';

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Search, UserRound } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { cx } from '@/theme/tokens';
import { Avatar } from '@/features/attendance-dashboard/components/Avatar';
import { hoursText, numText, pctText, PERIODS, periodTitle, rangeText } from '@/features/attendance-insights/constants/insights.constants';
import { PAGE_SIZE, useScorecard } from '../hooks/useScorecard';
import { ScoreBadge, ScorecardDetail } from './ScorecardDetail';
import type { ScorecardListDto, ScorecardRowDto, ScorecardSort } from '../types/scorecard.dto';

const control = 'h-9 w-full min-w-0 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-fg outline-none transition-colors hover:border-line-strong focus:border-[var(--tt-primary)]';
const iconBtn = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40';
const th = 'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted whitespace-nowrap';
const td = 'px-3 py-2.5 text-sm tabular-nums text-fg whitespace-nowrap';

interface Col { key: ScorecardSort; label: string; cell: (r: ScorecardRowDto) => React.ReactNode; show?: (d: ScorecardListDto) => boolean }
const COLUMNS: Col[] = [
  { key: 'score', label: 'Score', cell: (r) => <ScoreBadge score={r.score} /> },
  { key: 'attendance', label: 'Attendance', cell: (r) => <ScoreBadge score={r.attendance.score} /> },
  { key: 'punctuality', label: 'Punctuality', cell: (r) => pctText(r.attendance.punctuality_rate) },
  { key: 'late_days', label: 'Late days', cell: (r) => numText(r.attendance.late_days) },
  { key: 'overtime', label: 'Overtime', cell: (r) => hoursText(r.attendance.overtime_minutes) },
  { key: 'tasks', label: 'Tasks', cell: (r) => <ScoreBadge score={r.tasks?.score} />, show: (d) => d.sections.tasks },
  { key: 'meetings', label: 'Meetings', cell: (r) => <ScoreBadge score={r.meetings?.score} />, show: (d) => d.sections.meetings },
  { key: 'comp_off', label: 'Comp-off', cell: (r) => `${numText(r.comp_off.earned_days)}d` },
  { key: 'leave', label: 'Leave', cell: (r) => `${numText(r.leave.leave_days)}d` },
];

function Select({ label, value, options, onChange, allLabel }: { label: string; value: number | null; options: Array<{ id: number; name: string }>; onChange: (v: number | null) => void; allLabel: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</span>
      <select aria-label={label} className={control} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}>
        <option value="">{allLabel}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );
}

/**
 * Employee scorecard: one score per person for a week, month, quarter or year, from attendance (always),
 * tasks and meetings (when the organization has them), with comp-off, overtime and leave beside it.
 * Org admins, HR mode and SCORECARD_VIEW see everyone in scope; managers see their reporting line;
 * everyone else sees their own card. Used both under Management (org admin) and in the employee area.
 */
export function ScorecardPage() {
  const s = useScorecard();
  const d = s.data;
  const self = d?.mode === 'self';
  const cols = d ? COLUMNS.filter((c) => !c.show || c.show(d)) : COLUMNS;
  const longPeriod = s.filters.period === 'quarter' || s.filters.period === 'year';
  const inList = d?.me && d.mode !== 'self';

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-fg sm:text-2xl">{self ? 'My scorecard' : 'Employee scorecard'}</h1>
          <p className="text-sm text-fg-muted">Attendance, lates, overtime, comp-off, leave{d?.sections.tasks ? ', tasks' : ''}{d?.sections.meetings ? ', meetings' : ''} in one score</p>
        </div>
        <div className="flex items-center gap-2">
          {s.refreshing && d && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-fg-muted"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Updating</span>
          )}
          {inList && (
            <button type="button" onClick={() => s.openPerson(d!.me)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-bold text-fg hover:bg-bg-subtle">
              <UserRound className="h-4 w-4" /> My scorecard
            </button>
          )}
        </div>
      </header>

      <div className="rounded-xl border border-line bg-surface p-3 shadow-[var(--tt-shadow-sm)] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" aria-label="Previous period" className={iconBtn} disabled={!d} onClick={() => d && s.update({ date: d.prev_date })}><ChevronLeft className="h-4 w-4" /></button>
            <div className="min-w-0 px-1 text-center sm:min-w-[200px]">
              <p className="truncate text-sm font-bold text-fg">{d ? periodTitle(d.period, d.period_from, d.period_to, d.year_start) : 'Loading…'}</p>
              <p className="truncate text-xs text-fg-muted">{d ? `${rangeText(d.from, d.to)}${d.to < d.period_to ? ' · so far' : ''}` : ' '}</p>
            </div>
            <button type="button" aria-label="Next period" className={iconBtn} disabled={!d?.next_date} onClick={() => d?.next_date && s.update({ date: d.next_date })}><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-80"><SegmentedControl options={PERIODS} value={s.filters.period} onChange={(period) => s.update({ period })} /></div>
            {longPeriod && (
              <div className="w-full sm:w-56">
                <SegmentedControl options={[{ value: '1', label: 'Calendar' }, { value: '4', label: 'Apr – Mar' }] as const} value={String(s.filters.yearStart) as '1' | '4'} onChange={(v) => s.update({ yearStart: v === '4' ? 4 : 1 })} />
              </div>
            )}
          </div>
        </div>

        {d && !self && (
          <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Employee</span>
              <span className="relative flex items-center">
                <Search aria-hidden className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-fg-subtle" />
                <input value={s.searchInput} onChange={(e) => s.setSearchInput(e.target.value)} placeholder="Name or code" className={`${control} pl-8`} />
              </span>
            </label>
            <Select label="Site" allLabel="All sites" value={s.filters.siteId} options={d.options.sites} onChange={(v) => s.update({ siteId: v })} />
            <Select label="Department" allLabel="All departments" value={s.filters.departmentId} options={d.options.departments} onChange={(v) => s.update({ departmentId: v })} />
            <div className="flex items-end">
              <button type="button" onClick={s.reset} disabled={!s.filters.siteId && !s.filters.departmentId && !s.filters.date && !s.searchInput}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-line px-3 text-sm font-bold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto">
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
          </div>
        )}
        {d && !self && (
          <p className="mt-3 text-xs text-fg-muted">
            <strong className="font-bold text-fg">{d.headcount}</strong> {d.headcount === 1 ? 'person' : 'people'}{d.mode === 'team' ? ' · you and your reporting line' : ''}
            {d.average.score !== null && d.average.score !== undefined && <> · average score <strong className="font-bold text-fg">{Math.round(d.average.score)}</strong></>}
          </p>
        )}
      </div>

      {s.error && <p className="text-sm text-[var(--tt-danger)]">{s.error}</p>}

      {self ? (
        <div className="rounded-xl border border-line bg-surface p-3 sm:p-5"><ScorecardDetail data={s.person} error={s.personError} /></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          {s.loading ? <div className="p-4"><TableSkeleton rows={8} /></div> : !d || d.employees.items.length === 0 ? (
            <div className="p-8"><EmptyState title="No one to show" description="Nobody in view was active in this period, or the filters exclude everyone." /></div>
          ) : (
            <>
              <div className={cx('overflow-x-auto transition-opacity', s.refreshing && 'opacity-70')}>
                <table className="w-full min-w-[900px] border-collapse">
                  <thead className="bg-bg-subtle">
                    <tr>
                      <SortHead label="Employee" k="name" sort={s.sort} onSort={s.toggleSort} align="left" />
                      {cols.map((c) => <SortHead key={c.key} label={c.label} k={c.key} sort={s.sort} onSort={s.toggleSort} />)}
                    </tr>
                  </thead>
                  <tbody>
                    {d.employees.items.map((r) => (
                      <tr key={r.employee_id} onClick={() => s.openPerson(r.employee_id)} className="cursor-pointer border-t border-line hover:bg-bg-subtle">
                        <td className={cx(td, 'text-left')}>
                          <span className="flex items-center gap-2.5">
                            <Avatar src={r.photo_url ?? null} size={8} />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{r.name}{r.employee_id === d.me && <span className="ml-1.5 text-xs font-medium text-fg-muted">(you)</span>}</span>
                              <span className="block truncate text-xs text-fg-muted">{[r.employee_code, r.department, r.site].filter(Boolean).join(' · ')}</span>
                            </span>
                          </span>
                        </td>
                        {cols.map((c) => <td key={c.key} className={cx(td, 'text-right')}>{c.cell(r)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-line px-4 py-2.5">
                <Pagination currentPage={s.page} totalPages={Math.max(1, Math.ceil(d.employees.total / PAGE_SIZE))} totalItems={d.employees.total} pageSize={PAGE_SIZE} onPageChange={s.setPage} />
              </div>
            </>
          )}
        </div>
      )}

      <Drawer open={!self && s.personId !== null} onClose={s.closePerson} title="Employee scorecard" maxWidthClassName="sm:max-w-2xl">
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6"><ScorecardDetail data={s.person} error={s.personError} /></div>
      </Drawer>
    </div>
  );
}

function SortHead({ label, k, sort, onSort, align = 'right' }: { label: string; k: ScorecardSort; sort: { key: ScorecardSort; dir: 'asc' | 'desc' }; onSort: (k: ScorecardSort) => void; align?: 'left' | 'right' }) {
  const active = sort.key === k;
  const Icon = sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={cx(th, align === 'right' && 'text-right')} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(k)} className={cx('inline-flex items-center gap-1 uppercase hover:text-fg', active && 'text-fg')}>
        {label}{active && <Icon className="h-3 w-3" />}
      </button>
    </th>
  );
}
