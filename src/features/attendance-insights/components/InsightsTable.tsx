'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Download, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { cx } from '@/theme/tokens';
import { Avatar } from '@/features/attendance-dashboard/components/Avatar';
import { downloadCsv, EMPLOYEE_PAGE_SIZE, GROUPS, METRIC_COLUMNS } from '../constants/insights.constants';
import type { EmployeeRowDto, GroupRowDto, InsightGroup, InsightsDto, InsightSort } from '../types/insights.dto';

const th = 'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted whitespace-nowrap';
const td = 'px-3 py-2.5 text-sm tabular-nums text-fg whitespace-nowrap';

function SortHead({ label, k, sort, onSort, align = 'right' }: { label: string; k: InsightSort; sort: { key: InsightSort; dir: 'asc' | 'desc' }; onSort: (k: InsightSort) => void; align?: 'left' | 'right' }) {
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

/**
 * Figures by site, department or employee. Columns sort on the server; employees page and
 * search. Download writes the whole list under the current filters as CSV.
 */
export function InsightsTable({ data, group, onGroup, sort, onSort, searchInput, onSearch, page, onPage, loading, refreshing, onOpen, allEmployees }: {
  data: InsightsDto | null; group: InsightGroup; onGroup: (g: InsightGroup) => void; sort: { key: InsightSort; dir: 'asc' | 'desc' }; onSort: (k: InsightSort) => void;
  searchInput: string; onSearch: (s: string) => void; page: number; onPage: (p: number) => void; loading: boolean; refreshing: boolean;
  onOpen: (employeeId: number) => void; allEmployees: () => Promise<EmployeeRowDto[]>;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const isEmployees = group === 'employee';
  const groupRows: GroupRowDto[] = data?.groups ?? [];
  const employeeRows: EmployeeRowDto[] = data?.employees?.items ?? [];
  const total = isEmployees ? data?.employees?.total ?? 0 : groupRows.length;
  const label = GROUPS.find((g) => g.value === group)!.label;

  const download = async () => {
    if (!data) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const metricHead = METRIC_COLUMNS.map((c) => c.label);
      const file = `workforce-insights-${group}-${data.from}-to-${data.to}.csv`;
      if (isEmployees) {
        const rows = await allEmployees();
        downloadCsv(file, ['Employee', 'Code', 'Department', 'Site', ...metricHead],
          rows.map((r) => [r.name, r.employee_code, r.department, r.site, ...METRIC_COLUMNS.map((c) => c.csv(r as unknown as Record<string, unknown>))]));
      } else {
        downloadCsv(file, [label.replace(/s$/, ''), 'People', ...metricHead],
          groupRows.map((r) => [r.name, r.headcount, ...METRIC_COLUMNS.map((c) => c.csv(r as unknown as Record<string, unknown>))]));
      }
    } catch {
      setDownloadError('The file could not be made. Try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--tt-shadow-sm)]">
      <div className="flex flex-col gap-3 border-b border-line p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-bold text-fg">By {label.toLowerCase().replace(/s$/, '')}</h2>
          <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted tabular-nums">{total}</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {isEmployees && (
            <label className="relative block w-full sm:w-64">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
              <input type="search" value={searchInput} onChange={(e) => onSearch(e.target.value)} placeholder="Search name or code" aria-label="Search employees"
                className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle hover:border-line-strong focus:border-[var(--tt-primary)]" />
            </label>
          )}
          <div className="w-full sm:w-80"><SegmentedControl options={GROUPS} value={group} onChange={onGroup} /></div>
          <button type="button" onClick={download} disabled={!data || downloading || !total}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line px-3 text-sm font-bold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40">
            <Download className="h-4 w-4" /> {downloading ? 'Preparing…' : 'CSV'}
          </button>
        </div>
      </div>
      {downloadError && <p className="px-4 pt-2 text-xs text-[var(--tt-danger)]">{downloadError}</p>}

      {loading || (data && data.group !== group) ? (
        <div className="p-4"><TableSkeleton rows={6} columns={6} /></div>
      ) : !total ? (
        <div className="p-6">
          <EmptyState compact illustration={{ src: '/vectors/attendancedashboard.svg', width: 150, height: 100, alt: '' }}
            title={isEmployees && searchInput ? 'No one matches that search' : 'No attendance in this period'}
            description={isEmployees && searchInput ? 'Try another name or code.' : 'Pick another period or widen the filters.'} />
        </div>
      ) : (
        <div className={cx('overflow-x-auto transition-opacity', refreshing && 'opacity-70')}>
          <table className="w-full min-w-[960px] border-collapse">
            <thead className="bg-bg-subtle">
              <tr>
                <SortHead label={isEmployees ? 'Employee' : label.replace(/s$/, '')} k="name" sort={sort} onSort={onSort} align="left" />
                {!isEmployees && <SortHead label="People" k="headcount" sort={sort} onSort={onSort} />}
                {METRIC_COLUMNS.map((c) => <SortHead key={c.key} label={c.short || c.label} k={c.key} sort={sort} onSort={onSort} />)}
              </tr>
            </thead>
            <tbody>
              {isEmployees
                ? employeeRows.map((r) => (
                  <tr key={r.employee_id} onClick={() => onOpen(r.employee_id)} className="cursor-pointer border-t border-line transition-colors hover:bg-bg-subtle">
                    <td className={cx(td, 'max-w-[260px]')}>
                      <div className="flex items-center gap-2.5">
                        <Avatar src={r.photo_url ?? null} size={8} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{r.name}</p>
                          <p className="truncate text-xs text-fg-muted">{[r.employee_code, r.department, r.site].filter(Boolean).join(' · ')}</p>
                        </div>
                      </div>
                    </td>
                    {METRIC_COLUMNS.map((c) => <td key={c.key} className={cx(td, 'text-right')}>{c.text(r as unknown as Record<string, unknown>)}</td>)}
                  </tr>
                ))
                : groupRows.map((r) => (
                  <tr key={r.id ?? 'none'} className="border-t border-line">
                    <td className={cx(td, 'font-semibold', r.id === null && 'text-fg-muted')}>{r.name}</td>
                    <td className={cx(td, 'text-right')}>{r.headcount}</td>
                    {METRIC_COLUMNS.map((c) => <td key={c.key} className={cx(td, 'text-right')}>{c.text(r as unknown as Record<string, unknown>)}</td>)}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {isEmployees && total > EMPLOYEE_PAGE_SIZE && (
        <div className="border-t border-line px-4 py-2.5">
          <Pagination currentPage={page} totalPages={Math.ceil(total / EMPLOYEE_PAGE_SIZE)} totalItems={total} pageSize={EMPLOYEE_PAGE_SIZE} onPageChange={onPage} />
        </div>
      )}
    </section>
  );
}
