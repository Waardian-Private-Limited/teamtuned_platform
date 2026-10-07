'use client';

import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { useFilterOptions } from '../hooks/useFilterOptions';
import type { TrackingFilters as Filters } from '../types/tracking.dto';

/** Sub-organization, department, role and site: the same narrowing on the live map, summaries and timelines. */
export function TrackingFilters({
  value,
  onChange,
}: {
  value: Filters;
  onChange: (next: Filters) => void;
}) {
  const { departments, roles, sites } = useFilterOptions();
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SubOrgFilter
        value={value.subOrgId ?? null}
        onChange={(v) => set({ subOrgId: v })}
      />
      <SearchableFilterDropdown
        label="Department"
        allLabel="All departments"
        value={value.departmentId}
        options={departments}
        onChange={(v) => set({ departmentId: v })}
      />
      <SearchableFilterDropdown
        label="Role"
        allLabel="All roles"
        value={value.roleId}
        options={roles}
        onChange={(v) => set({ roleId: v })}
      />
      <SearchableFilterDropdown
        label="Site"
        allLabel="All sites"
        value={value.siteId}
        options={sites}
        onChange={(v) => set({ siteId: v })}
      />
    </div>
  );
}
