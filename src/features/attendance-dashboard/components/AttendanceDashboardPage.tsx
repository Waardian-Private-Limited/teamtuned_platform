'use client';

import { RefreshCw } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { cx } from '@/theme/tokens';
import { dayText } from '../constants/dashboard.constants';
import { useAttendanceDashboard } from '../hooks/useAttendanceDashboard';
import { useLeaderboards } from '../hooks/useLeaderboards';
import { ArrivalsChart } from './ArrivalsChart';
import { Breakdown } from './Breakdown';
import { EmployeesDialog } from './EmployeesDialog';
import { FilterBar } from './FilterBar';
import { Kpis } from './Kpis';
import { LeaderboardDialog } from './LeaderboardDialog';
import { Leaderboards } from './Leaderboards';
import { StatusBreakdown } from './StatusBreakdown';
import { TrendChart } from './TrendChart';

/**
 * The attendance dashboard: filters, the headline figures, where everyone is, leaderboards,
 * the trend and arrivals, and breakdowns. Every tile and board opens the people behind it
 * in a popup table. Today refreshes each minute.
 */
export function AttendanceDashboardPage() {
  const d = useAttendanceDashboard();
  const l = useLeaderboards(d.filters, d.isToday);
  const active = d.listOpen ? d.view : null;
  const o = d.overview;
  const loading = d.loadingOverview;
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-fg sm:text-2xl">Attendance</h1>
          <p className="text-sm text-fg-muted">{d.filters.date ? `${dayText(d.filters.date)}${d.isToday ? ' · live' : ''}` : 'Loading…'}</p>
        </div>
        {d.isToday && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-fg-muted">
            <RefreshCw className={cx('h-3.5 w-3.5', d.refreshingOverview && 'animate-spin')} /> Updates every minute
          </span>
        )}
      </header>

      <FilterBar filters={d.filters} options={d.options} onChange={d.update} onReset={d.reset} narrowed={d.narrowed} headcount={o ? o.summary.headcount : null} />
      {(d.error || l.error) && <Alert message={(d.error || l.error)!} />}

      <Kpis summary={o?.summary ?? null} isToday={d.isToday} view={active} onView={d.openList} loading={loading} />
      <StatusBreakdown summary={o?.summary ?? null} isToday={d.isToday} view={active} onView={d.openList} loading={loading} />

      <Leaderboards data={l.data} period={l.period} onPeriod={l.setPeriod} loading={l.loading} onOpen={l.openBoard} />

      <div className="grid gap-4 xl:grid-cols-2">
        <TrendChart trend={o?.trend ?? null} loading={loading} />
        <ArrivalsChart arrivals={o?.arrivals ?? null} loading={loading} />
      </div>

      <Breakdown byDepartment={o?.by_department ?? null} bySite={o?.by_site ?? null} loading={loading} />

      <EmployeesDialog open={d.listOpen} onClose={d.closeList} date={d.filters.date} list={d.list} summary={o?.summary ?? null} isToday={d.isToday}
        view={d.view} onView={d.setView} search={d.search} onSearch={d.setSearch} page={d.page} onPage={d.setPage} loading={d.loadingList} />
      <LeaderboardDialog board={l.board} period={l.period} data={l.full} page={l.page} onPage={l.setPage} loading={l.loadingFull} onClose={l.closeBoard} />
    </div>
  );
}
