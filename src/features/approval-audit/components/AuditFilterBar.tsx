'use client';

import { RotateCcw } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { FilterOptionsDto } from '@/features/attendance-dashboard/types/dashboard.dto';
import { control } from './parts';
import { rangeText } from '../utils/format';
import type { AuditFilters, RangePreset } from '../types/audit.dto';

const PRESETS: ReadonlyArray<{ value: RangePreset; label: string }> = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom' },
];

function Select({ label, value, options, onChange, allLabel, disabled }: { label: string; value: string | number | null; options: Array<{ id: string | number; name: string }>; onChange: (v: string | null) => void; allLabel: string; disabled?: boolean }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</span>
      <select aria-label={label} className={control} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );
}

/**
 * Period (presets or custom dates), then sub-organisation, site, department and request type.
 * The line under it says what is being audited, so an empty result always has a reason.
 */
export function AuditFilterBar({ filters, options, types, onChange, onPreset, onReset, narrowed }: {
  filters: AuditFilters;
  options: FilterOptionsDto | null;
  types: Array<{ type: string; label: string }>;
  onChange: (p: Partial<AuditFilters>) => void;
  onPreset: (p: RangePreset) => void;
  onReset: () => void;
  narrowed: boolean;
}) {
  const today = options?.today ?? '';
  const showSubOrg = !!options && options.sub_organizations.length > 0;
  const site = options?.sites.find((s) => s.id === filters.siteId);
  const dept = options?.departments.find((d) => d.id === filters.departmentId);
  const type = types.find((t) => t.type === filters.requestType);
  const num = (v: string | null) => (v === null ? null : Number(v));

  return (
    <div className="rounded-xl border border-line bg-surface p-3 shadow-[var(--tt-shadow-sm)] sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Period</span>
          <div role="radiogroup" aria-label="Period" className="flex flex-wrap gap-1 rounded-lg border border-line bg-bg-subtle p-1">
            {PRESETS.map((p) => (
              <button key={p.value} type="button" role="radio" aria-checked={filters.preset === p.value} onClick={() => onPreset(p.value)}
                className={cx('h-7 rounded-md px-2.5 text-xs font-semibold transition-colors', filters.preset === p.value ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg')}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {filters.preset === 'custom' && (
          <div className="grid grid-cols-2 gap-2 sm:w-80">
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">From</span>
              <input type="date" aria-label="From" className={control} value={filters.from} max={filters.to || today || undefined} onChange={(e) => e.target.value && onChange({ from: e.target.value })} />
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">To</span>
              <input type="date" aria-label="To" className={control} value={filters.to} min={filters.from || undefined} max={today || undefined} onChange={(e) => e.target.value && onChange({ to: e.target.value })} />
            </label>
          </div>
        )}
      </div>

      <div className={cx('mt-3 grid gap-3 sm:grid-cols-2', showSubOrg ? 'lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]' : 'lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]')}>
        {showSubOrg && <Select label="Sub-organisation" allLabel="All sub-organisations" value={filters.subOrgId} options={options!.sub_organizations} onChange={(v) => onChange({ subOrgId: num(v) })} />}
        <Select label="Site" allLabel={options?.access.all_sites === false ? 'All my sites' : 'All sites'} value={filters.siteId} options={options?.sites ?? []} onChange={(v) => onChange({ siteId: num(v) })} />
        <Select label="Department" allLabel="All departments" value={filters.departmentId} options={options?.departments ?? []} onChange={(v) => onChange({ departmentId: num(v) })} />
        <Select label="Request type" allLabel="All types" value={filters.requestType} options={types.map((t) => ({ id: t.type, name: t.label }))} onChange={(v) => onChange({ requestType: v })} />
        <div className="flex items-end">
          <button type="button" onClick={onReset} disabled={!narrowed}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[var(--tt-radius-control)] border border-line px-3 text-sm font-bold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      <p className="mt-3 border-t border-line pt-3 text-xs text-fg-muted">
        {filters.from ? <strong className="font-bold text-fg">{rangeText(filters.from, filters.to)}</strong> : 'Loading…'}
        {' · '}{site ? site.name : options?.access.all_sites === false ? 'Sites in your reach' : 'All sites'}
        {dept && <> · {dept.name}</>}
        {' · '}{type ? type.label : 'All request types'}
        {' · '}a request belongs to its requester&apos;s primary site and department
      </p>
    </div>
  );
}
