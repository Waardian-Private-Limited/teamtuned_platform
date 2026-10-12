'use client';

import { Download, Plus, Search, X } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SearchableFilterDropdown, type FilterOption } from '@/components/ui/SearchableFilterDropdown';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { ADVANCE_TABS } from '../../constants/salaryAdvance.constants';
import type { AdvanceListFilters, AdvanceListTab } from '../../types/salaryAdvance.model';

interface AdvancesToolbarProps {
  total: number;
  counts: Record<string, number>;
  filters: AdvanceListFilters;
  onChange: (patch: Partial<AdvanceListFilters>) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  types: FilterOption[];
  sites: FilterOption[];
  departments: FilterOption[];
  canCreate: boolean;
  onCreate: () => void;
  onExport: () => void;
}

export function AdvancesToolbar({
  total,
  counts,
  filters,
  onChange,
  searchValue,
  onSearchChange,
  types,
  sites,
  departments,
  canCreate,
  onCreate,
  onExport,
}: AdvancesToolbarProps) {
  const tabs = ADVANCE_TABS.map((t) => ({ value: t.value, label: counts[t.value] ? `${t.label} ${counts[t.value]}` : t.label }));

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Advances</h1>
            <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold tabular-nums text-fg-muted 2xl:text-sm">{total}</span>
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-8.5 items-center justify-center gap-1 rounded-lg bg-[var(--tt-primary)] px-2.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:hidden"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SubOrgFilter value={filters.subOrgId} onChange={(subOrgId) => onChange({ subOrgId })} />
          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm 2xl:h-10"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="hidden h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:inline-flex sm:text-sm 2xl:h-10 2xl:px-4"
            >
              <Plus className="h-3.5 w-3.5" />
              New advance
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="w-full overflow-x-auto tt-scroll-hidden xl:w-auto">
          <SegmentedControl<AdvanceListTab> options={tabs} value={filters.tab} onChange={(tab) => onChange({ tab })} fitText />
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center xl:flex-nowrap">
          <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] md:w-56 2xl:h-10 2xl:w-64">
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
          <div className="grid grid-cols-3 gap-2 md:flex">
            <SearchableFilterDropdown label="Type" allLabel="All types" value={filters.typeId} options={types} onChange={(typeId) => onChange({ typeId })} className="md:w-40" />
            <SearchableFilterDropdown label="Site" allLabel="All sites" value={filters.siteId} options={sites} onChange={(siteId) => onChange({ siteId })} className="md:w-36" />
            <SearchableFilterDropdown label="Department" allLabel="All departments" value={filters.departmentId} options={departments} onChange={(departmentId) => onChange({ departmentId })} className="md:w-44" />
          </div>
        </div>
      </div>
    </div>
  );
}
