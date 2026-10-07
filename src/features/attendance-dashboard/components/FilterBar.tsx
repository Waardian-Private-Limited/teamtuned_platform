'use client';

import { CalendarDays, RotateCcw } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { DashboardFilters, FilterOptionsDto } from '../types/dashboard.dto';

const control = 'h-9 w-full min-w-0 rounded-[var(--tt-radius-control)] border border-line bg-surface px-3 text-sm font-semibold text-fg outline-none transition-colors hover:border-line-strong focus:border-[var(--tt-primary)] disabled:opacity-50';

function Select({ label, value, options, onChange, disabled, allLabel }: { label: string; value: number | null; options: Array<{ id: number; name: string }>; onChange: (v: number | null) => void; disabled?: boolean; allLabel: string }) {
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
 * Date, then sub-organisation (whenever the person can see one), site, department
 * and role. A line under it says what is being shown, so an empty result always has a reason.
 */
export function FilterBar({ filters, options, onChange, onReset, narrowed, headcount }: { filters: DashboardFilters; options: FilterOptionsDto | null; onChange: (p: Partial<DashboardFilters>) => void; onReset: () => void; narrowed: boolean; headcount: number | null }) {
  const today = options?.today ?? '';
  const showSubOrg = !!options && options.sub_organizations.length > 0;
  const subOrg = options?.sub_organizations.find((s) => s.id === filters.subOrgId);
  const site = options?.sites.find((s) => s.id === filters.siteId);
  const dept = options?.departments.find((d) => d.id === filters.departmentId);
  const role = options?.roles.find((r) => r.id === filters.roleId);
  const noSites = !!options && options.sites.length === 0;

  return (
    <div className="rounded-xl border border-line bg-surface p-3 shadow-[var(--tt-shadow-sm)] sm:p-4">
      <div className={cx('grid gap-3 sm:grid-cols-2', showSubOrg ? 'lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]' : 'lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]')}>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Date</span>
          <div className="relative">
            <CalendarDays aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input type="date" aria-label="Date" value={filters.date} max={today || undefined} onChange={(e) => e.target.value && onChange({ date: e.target.value })} className={cx(control, 'w-full pl-9')} />
          </div>
        </div>
        {showSubOrg && <Select label="Sub-organisation" allLabel="All sub-organisations" value={filters.subOrgId} options={options!.sub_organizations} onChange={(v) => onChange({ subOrgId: v })} />}
        <Select label="Site" allLabel={options?.access.all_sites === false ? 'All my sites' : 'All sites'} value={filters.siteId} options={options?.sites ?? []} onChange={(v) => onChange({ siteId: v })} disabled={noSites} />
        <Select label="Department" allLabel="All departments" value={filters.departmentId} options={options?.departments ?? []} onChange={(v) => onChange({ departmentId: v })} />
        <Select label="Role" allLabel="All roles" value={filters.roleId} options={options?.roles ?? []} onChange={(v) => onChange({ roleId: v })} />
        <div className="flex items-end">
          <button type="button" onClick={onReset} disabled={!narrowed && filters.date === today}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[var(--tt-radius-control)] border border-line px-3 text-sm font-bold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>
      <p className="mt-3 border-t border-line pt-3 text-xs text-fg-muted">
        {headcount === null ? 'Loading…' : <><strong className="font-bold text-fg">{headcount}</strong> {headcount === 1 ? 'employee' : 'employees'}</>}
        {' · '}{subOrg ? subOrg.name : options?.access.pick_sub_org ? 'All sub-organisations' : 'Your organisation'}
        {' · '}{site ? site.name : options?.access.all_sites === false ? 'Sites you are in charge of' : 'All sites'}
        {dept && <> · {dept.name}</>}
        {role && <> · {role.name}</>}
        {noSites && <span className="ml-1 font-semibold text-[var(--tt-warning)]">· No sites are linked to this sub-organisation; everyone in it is shown.</span>}
      </p>
    </div>
  );
}
