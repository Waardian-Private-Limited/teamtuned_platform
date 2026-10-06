'use client';

import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { useFilterOptions } from '../hooks/useFilterOptions';
import type { TrackingFilters as Filters } from '../types/tracking.dto';

const selectClass =
  'h-9 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg outline-none transition-colors focus:border-[var(--tt-primary)] sm:text-sm';

function Pick({ label, value, options, onChange }: { label: string; value: number | null | undefined; options: Array<{ value: number; label: string }>; onChange: (v: number | null) => void }) {
  return (
    <select aria-label={label} className={selectClass} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}>
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/** Sub-organization, department, role and site: the same narrowing on the live map, summaries and timelines. */
export function TrackingFilters({ value, onChange }: { value: Filters; onChange: (next: Filters) => void }) {
  const { departments, roles, sites } = useFilterOptions();
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SubOrgFilter value={value.subOrgId ?? null} onChange={(v) => set({ subOrgId: v })} />
      <Pick label="All departments" value={value.departmentId} options={departments} onChange={(v) => set({ departmentId: v })} />
      <Pick label="All roles" value={value.roleId} options={roles} onChange={(v) => set({ roleId: v })} />
      <Pick label="All sites" value={value.siteId} options={sites} onChange={(v) => set({ siteId: v })} />
    </div>
  );
}
