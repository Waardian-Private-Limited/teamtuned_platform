'use client';

import { Search } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SearchableFilterDropdown, type FilterOption } from '@/components/ui/SearchableFilterDropdown';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { SITE_SEGMENT_OPTIONS, type SiteSegment } from '../../constants/employeeSites.constants';
import type { EmployeeSiteSummary } from '../../types/employeeSites.model';

interface EmployeeSitesToolbarProps {
  total: number;
  summary: EmployeeSiteSummary;
  searchValue: string;
  onSearchChange: (value: string) => void;
  segment: SiteSegment;
  onSegmentChange: (value: SiteSegment) => void;
  departments: FilterOption[];
  departmentId: number | null;
  onDepartmentChange: (id: number | null) => void;
  sites: FilterOption[];
  siteId: number | null;
  onSiteChange: (id: number | null) => void;
  subOrgId: number | null;
  onSubOrgChange: (id: number | null) => void;
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[11px] font-medium text-fg-muted 2xl:text-xs">
      <span className="font-semibold text-fg">{value}</span>
      {label}
    </span>
  );
}

export function EmployeeSitesToolbar({
  total,
  summary,
  searchValue,
  onSearchChange,
  segment,
  onSegmentChange,
  departments,
  departmentId,
  onDepartmentChange,
  sites,
  siteId,
  onSiteChange,
  subOrgId,
  onSubOrgChange,
}: EmployeeSitesToolbarProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 xl:flex-row xl:items-center xl:justify-between xl:gap-4 2xl:p-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Site Assignment</h1>
        <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted 2xl:text-sm">
          {total}
        </span>
        <SummaryChip label="unassigned" value={summary.unassigned} />
        <SummaryChip label="in-charge" value={summary.incharge} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
        <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-48 md:w-56 lg:w-52 xl:w-56 2xl:h-10 2xl:w-72">
          <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle 2xl:h-4 2xl:w-4" />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Name, code or phone…"
            aria-label="Search employees"
            className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0 sm:text-sm 2xl:text-base"
          />
        </div>

        {departments.length > 0 && (
          <SearchableFilterDropdown
            label="Department"
            allLabel="All departments"
            value={departmentId}
            options={departments}
            onChange={onDepartmentChange}
          />
        )}

        {sites.length > 0 && (
          <SearchableFilterDropdown
            label="Site"
            allLabel="All sites"
            value={siteId}
            options={sites}
            onChange={onSiteChange}
            searchPlaceholder="Search sites…"
          />
        )}

        <div className="w-full sm:w-64 2xl:w-72">
          <SegmentedControl options={SITE_SEGMENT_OPTIONS} value={segment} onChange={onSegmentChange} />
        </div>

        <SubOrgFilter value={subOrgId} onChange={onSubOrgChange} />
      </div>
    </div>
  );
}
