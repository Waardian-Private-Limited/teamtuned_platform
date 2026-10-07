'use client';

import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { FilterOptionsDto } from '@/features/attendance-dashboard/types/dashboard.dto';
import type { Filters } from '../../hooks/useAttendanceList';
import { shiftDate } from '../../utils/format';
import { controlClass, IconButton, Select } from './controls';

/**
 * Date (with day-by-day arrows and Today), then sub-organisation, site, department and role,
 * and a search. Who may see which sites is decided by the server, so nobody has to switch a
 * mode: an HR user sees every site, a site in-charge sees theirs.
 */
export function FilterBar({ filters, options, onChange, onReset, narrowed, search, onSearch }: {
  filters: Filters; options: FilterOptionsDto | null; onChange: (p: Partial<Filters>) => void; onReset: () => void; narrowed: boolean; search: string; onSearch: (v: string) => void;
}) {
  const today = options?.today ?? '';
  const showSubOrg = !!options && options.sub_organizations.length > 0;
  const canGoForward = !!today && filters.date < today;

  return (
    <div className="rounded-xl border border-line bg-surface p-3 shadow-[var(--tt-shadow-sm)] sm:p-4">
      <div className={cx('grid gap-3 sm:grid-cols-2', showSubOrg ? 'lg:grid-cols-[auto_repeat(4,minmax(0,1fr))_auto]' : 'lg:grid-cols-[auto_repeat(3,minmax(0,1fr))_auto]')}>
        <div className="flex min-w-0 flex-col gap-1 sm:col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Date</span>
          <div className="flex items-center gap-1.5">
            <IconButton label="Previous day" onClick={() => onChange({ date: shiftDate(filters.date, -1) })} disabled={!filters.date}><ChevronLeft className="h-4 w-4" /></IconButton>
            <div className="relative">
              <CalendarDays aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
              <input type="date" aria-label="Date" value={filters.date} max={today || undefined} onChange={(e) => e.target.value && onChange({ date: e.target.value })} className={cx(controlClass, 'w-[11.5rem] pl-9')} />
            </div>
            <IconButton label="Next day" onClick={() => onChange({ date: shiftDate(filters.date, 1) })} disabled={!canGoForward}><ChevronRight className="h-4 w-4" /></IconButton>
            <button type="button" disabled={!today || filters.date === today} onClick={() => onChange({ date: today })}
              className="h-9 rounded-[var(--tt-radius-control)] border border-line px-3 text-xs font-bold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40">
              Today
            </button>
          </div>
        </div>
        {showSubOrg && <Select label="Sub-organisation" allLabel="All sub-organisations" value={filters.subOrgId} options={options!.sub_organizations} onChange={(v) => onChange({ subOrgId: v })} />}
        <Select label="Site" allLabel={options?.access.all_sites === false ? 'All my sites' : 'All sites'} value={filters.siteId} options={options?.sites ?? []} onChange={(v) => onChange({ siteId: v })} disabled={!!options && options.sites.length === 0} />
        <Select label="Department" allLabel="All departments" value={filters.departmentId} options={options?.departments ?? []} onChange={(v) => onChange({ departmentId: v })} />
        <Select label="Role" allLabel="All roles" value={filters.roleId} options={options?.roles ?? []} onChange={(v) => onChange({ roleId: v })} />
        <div className="flex items-end">
          <button type="button" onClick={onReset} disabled={!narrowed && filters.date === today}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[var(--tt-radius-control)] border border-line px-3 text-sm font-bold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>
      <label className="relative mt-3 block">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
        <input type="search" value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search by name or employee code" aria-label="Search employees" className={cx(controlClass, 'pl-9 font-medium')} />
      </label>
    </div>
  );
}
