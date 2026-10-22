'use client';

import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { cx } from '@/theme/tokens';
import type { FilterOptionsDto } from '@/features/attendance-dashboard/types/dashboard.dto';
import { PERIODS, periodTitle, rangeText } from '../constants/insights.constants';
import type { InsightFilters, InsightsDto } from '../types/insights.dto';

const control = 'h-9 w-full min-w-0 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-fg outline-none transition-colors hover:border-line-strong focus:border-[var(--tt-primary)] disabled:opacity-50';
const iconBtn = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40';

function Select({ label, value, options, onChange, allLabel, disabled }: { label: string; value: number | null; options: Array<{ id: number; name: string }>; onChange: (v: number | null) => void; allLabel: string; disabled?: boolean }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</span>
      <select aria-label={label} className={control} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}>
        <option value="">{allLabel}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );
}

/**
 * Period (week to year) with previous / next, the year basis for quarters and years, and the
 * scope filters. The line under it says what is covered.
 */
export function InsightsToolbar({ filters, options, data, onChange, onReset, narrowed }: {
  filters: InsightFilters; options: FilterOptionsDto | null; data: InsightsDto | null; onChange: (p: Partial<InsightFilters>) => void; onReset: () => void; narrowed: boolean;
}) {
  const showSubOrg = !!options && options.sub_organizations.length > 0;
  const longPeriod = filters.period === 'quarter' || filters.period === 'year';
  return (
    <div className="rounded-xl border border-line bg-surface p-3 shadow-[var(--tt-shadow-sm)] sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" aria-label="Previous period" className={iconBtn} disabled={!data} onClick={() => data && onChange({ date: data.prev_date })}><ChevronLeft className="h-4 w-4" /></button>
          <div className="min-w-0 px-1 text-center sm:min-w-[200px]">
            <p className="truncate text-sm font-bold text-fg">{data ? periodTitle(data.period, data.period_from, data.period_to, data.year_start) : 'Loading…'}</p>
            <p className="truncate text-xs text-fg-muted">{data ? `${rangeText(data.from, data.to)}${data.to < data.period_to ? ' · so far' : ''}` : ' '}</p>
          </div>
          <button type="button" aria-label="Next period" className={iconBtn} disabled={!data?.next_date} onClick={() => data?.next_date && onChange({ date: data.next_date })}><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-80"><SegmentedControl options={PERIODS} value={filters.period} onChange={(period) => onChange({ period })} /></div>
          {longPeriod && (
            <div className="w-full sm:w-56">
              <SegmentedControl options={[{ value: '1', label: 'Calendar' }, { value: '4', label: 'Apr – Mar' }] as const} value={String(filters.yearStart) as '1' | '4'} onChange={(v) => onChange({ yearStart: v === '4' ? 4 : 1 })} />
            </div>
          )}
        </div>
      </div>

      <div className={cx('mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2', showSubOrg ? 'lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]' : 'lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]')}>
        {showSubOrg && <Select label="Sub-organisation" allLabel="All sub-organisations" value={filters.subOrgId} options={options!.sub_organizations} onChange={(v) => onChange({ subOrgId: v })} />}
        <Select label="Site" allLabel={options?.access.all_sites === false ? 'All my sites' : 'All sites'} value={filters.siteId} options={options?.sites ?? []} onChange={(v) => onChange({ siteId: v })} disabled={!!options && options.sites.length === 0} />
        <Select label="Department" allLabel="All departments" value={filters.departmentId} options={options?.departments ?? []} onChange={(v) => onChange({ departmentId: v })} />
        <Select label="Role" allLabel="All roles" value={filters.roleId} options={options?.roles ?? []} onChange={(v) => onChange({ roleId: v })} />
        <div className="flex items-end">
          <button type="button" onClick={onReset} disabled={!narrowed && !filters.date}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-line px-3 text-sm font-bold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-fg-muted">
        {data ? <><strong className="font-bold text-fg">{data.headcount}</strong> {data.headcount === 1 ? 'employee' : 'employees'} active on {rangeText(data.to, data.to)}</> : 'Loading…'}
        {options?.access.all_sites === false && ' · sites you are assigned to'}
      </p>
    </div>
  );
}
