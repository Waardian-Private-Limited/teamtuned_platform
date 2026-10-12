'use client';

import { Search, X } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import { ITEM_STATUS_OPTIONS } from '../../constants/payrollRuns.constants';
import type { FilterOption, ItemFilters } from '../../types/payrollRuns.model';

interface ItemsToolbarProps {
  title: string;
  total: number;
  searchValue: string;
  onSearchChange: (v: string) => void;
  filters: ItemFilters;
  onChange: (patch: Partial<ItemFilters>) => void;
  sites: FilterOption[];
  departments: FilterOption[];
  counts: Record<string, number> | null;
}

export function ItemsToolbar({ title, total, searchValue, onSearchChange, filters, onChange, sites, departments, counts }: ItemsToolbarProps) {
  const options = ITEM_STATUS_OPTIONS.map((o) => ({
    value: o.value,
    label: counts && o.value !== 'all' && counts[o.value] ? `${o.label} ${counts[o.value]}` : o.label,
  }));

  return (
    <div className="flex flex-col gap-2.5 border-b border-line p-3 sm:p-3.5 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-2">
        <h2 className="truncate text-sm font-bold text-fg sm:text-base">{title}</h2>
        <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold tabular-nums text-fg-muted">{total}</span>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center xl:flex-nowrap">
        <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] md:w-56 2xl:w-64">
          <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name or code…"
            className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm"
          />
          {searchValue && (
            <button type="button" aria-label="Clear search" onClick={() => onSearchChange('')} className="text-fg-subtle hover:text-fg">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="overflow-x-auto tt-scroll-hidden">
          <SegmentedControl options={options} value={filters.status} onChange={(status) => onChange({ status })} fitText />
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <SearchableFilterDropdown label="Site" allLabel="All sites" value={filters.siteId} options={sites} onChange={(siteId) => onChange({ siteId })} className="md:w-40" />
          <SearchableFilterDropdown label="Department" allLabel="All departments" value={filters.departmentId} options={departments} onChange={(departmentId) => onChange({ departmentId })} className="md:w-44" />
        </div>
      </div>
    </div>
  );
}
