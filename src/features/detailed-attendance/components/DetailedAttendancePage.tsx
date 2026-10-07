'use client';

import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { cx } from '@/theme/tokens';
import { useAttendanceList } from '../hooks/useAttendanceList';
import { longDayText, monthOf } from '../utils/format';
import { DayPopup } from './DayPopup';
import { EmployeeCards, EmployeeTable, ListSkeleton } from './components/EmployeeRows';
import { ExportDialog } from './components/ExportDialog';
import { FilterBar } from './components/FilterBar';
import { MonthDialog } from './components/MonthDialog';

/**
 * Detailed attendance: who is where on a date, with the day in one badge, last night's night
 * overtime and the month so far. Two actions per person: the day (every check-in and what the
 * policy decided, with override) and the month (a calendar with payroll totals and balances).
 */
export function DetailedAttendancePage() {
  const l = useAttendanceList();
  const [day, setDay] = React.useState<{ employeeId: number; date: string } | null>(null);
  const [month, setMonth] = React.useState<{ employeeId: number; month: string } | null>(null);
  const [exporting, setExporting] = React.useState(false);
  // Bumped after an override so the open month and the list read the new figures.
  const [version, setVersion] = React.useState(0);

  const list = l.list;
  const today = l.options?.today ?? '';

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-fg sm:text-2xl">Detailed attendance</h1>
          <p className="text-sm text-fg-muted">{l.filters.date ? `${longDayText(l.filters.date)}${l.isToday ? ' · live' : ''}` : 'Loading…'}</p>
        </div>
        <div className="flex items-center gap-2">
          {l.isToday && <span className="hidden items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-fg-muted sm:inline-flex"><RefreshCw className={cx('h-3.5 w-3.5', l.refreshing && 'animate-spin')} /> Updates every minute</span>}
          <button type="button" onClick={() => setExporting(true)} disabled={!today}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] transition-colors hover:bg-[var(--tt-primary-hover)] disabled:opacity-40 sm:text-sm">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </header>

      <FilterBar filters={l.filters} options={l.options} onChange={l.update} onReset={l.reset} narrowed={l.narrowed} search={l.searchInput} onSearch={l.setSearchInput} />
      {l.error && <Alert message={l.error} />}

      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--tt-shadow-sm)]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-bold text-fg">{list ? `${list.total} ${list.total === 1 ? 'person' : 'people'}` : 'People'}</p>
        </div>
        {l.loading ? <ListSkeleton /> : list && list.rows.length === 0 ? (
          <EmptyState
            illustration={{ src: '/vectors/attendancedashboard.svg', width: 220, height: 160, alt: 'No one found' }}
            title="No one matches"
            description="Try another date, or widen the filters."
            action={l.narrowed ? { label: 'Reset filters', onClick: l.reset, variant: 'link' } : undefined}
          />
        ) : list ? (
          <>
            <EmployeeTable rows={list.rows} busy={l.refreshing} onDay={(r) => setDay({ employeeId: r.employeeId, date: list.date })} onMonth={(r) => setMonth({ employeeId: r.employeeId, month: monthOf(list.date) })} />
            <EmployeeCards rows={list.rows} busy={l.refreshing} onDay={(r) => setDay({ employeeId: r.employeeId, date: list.date })} onMonth={(r) => setMonth({ employeeId: r.employeeId, month: monthOf(list.date) })} />
            <div className="border-t border-line p-3">
              <Pagination currentPage={l.page} totalPages={Math.max(1, Math.ceil(list.total / l.pageSize))} totalItems={list.total} pageSize={l.pageSize} onPageChange={l.setPage} pageSizeOptions={[l.pageSize]} />
            </div>
          </>
        ) : null}
      </section>

      <MonthDialog employeeId={month ? month.employeeId : null} startMonth={month ? month.month : ''} childOpen={!!day} reloadKey={version}
        onClose={() => setMonth(null)} onOpenDay={(employeeId, date) => setDay({ employeeId, date })} />
      <DayPopup employeeId={day ? day.employeeId : null} date={day ? day.date : null} reloadKey={version}
        onClose={() => setDay(null)} onMonth={(employeeId, m) => { setDay(null); setMonth({ employeeId, month: m }); }} onChanged={() => { setVersion((v) => v + 1); l.reload(); }} />
      <ExportDialog open={exporting} today={today} filters={l.filters} options={l.options} onClose={() => setExporting(false)} />
    </div>
  );
}
