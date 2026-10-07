'use client';

import { RefreshCw } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { cx } from '@/theme/tokens';
import { dayText } from '../constants/dashboard.constants';
import { useAttendanceDashboard } from '../hooks/useAttendanceDashboard';
import { ArrivalsChart } from './ArrivalsChart';
import { Breakdown } from './Breakdown';
import { EmployeesPanel } from './EmployeesPanel';
import { FilterBar } from './FilterBar';
import { Kpis } from './Kpis';
import { StatusBreakdown } from './StatusBreakdown';
import { TrendChart } from './TrendChart';

/**
 * The attendance dashboard: filters, the headline figures, where everyone is, the trend
 * and arrivals, breakdowns, and the people behind every number. Today refreshes each minute.
 */
export function AttendanceDashboardPage() {
  const d = useAttendanceDashboard();
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
      {d.error && <Alert message={d.error} />}

      <Kpis summary={o?.summary ?? null} isToday={d.isToday} view={d.view} onView={d.setView} loading={loading} />
      <StatusBreakdown summary={o?.summary ?? null} isToday={d.isToday} view={d.view} onView={d.setView} loading={loading} />

      <div className="grid gap-4 xl:grid-cols-2">
        <TrendChart trend={o?.trend ?? null} loading={loading} />
        <ArrivalsChart arrivals={o?.arrivals ?? null} loading={loading} />
      </div>

      <Breakdown byDepartment={o?.by_department ?? null} bySite={o?.by_site ?? null} loading={loading} />

      <EmployeesPanel list={d.list} summary={o?.summary ?? null} isToday={d.isToday} view={d.view} onView={d.setView} search={d.search} onSearch={d.setSearch} page={d.page} onPage={d.setPage} loading={d.loadingList} onReset={d.reset} />
    </div>
  );
}
