'use client';

import { Plus, Search } from 'lucide-react';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import { loadSiteOptions } from '../../api/pickerLoaders';
import type { PickerOption } from '../../types/siteSubOrgMapper.model';
import { RemoteSearchSelect } from './RemoteSearchSelect';

interface MapperToolbarProps {
  total: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  subOrgOptions: PickerOption[];
  subOrgId: number | null;
  onSubOrgChange: (id: number | null) => void;
  site: PickerOption | null;
  onSiteChange: (site: PickerOption | null) => void;
  canAdd: boolean;
  onAdd: () => void;
}

export function MapperToolbar({
  total,
  searchValue,
  onSearchChange,
  subOrgOptions,
  subOrgId,
  onSubOrgChange,
  site,
  onSiteChange,
  canAdd,
  onAdd,
}: MapperToolbarProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4 2xl:p-4">
      <div className="flex items-center justify-between gap-3 lg:justify-start">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Site-Sub-Org Mapper</h1>
          <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted 2xl:text-sm">
            {total}
          </span>
        </div>

        {canAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-8.5 items-center justify-center gap-1 rounded-lg bg-[var(--tt-primary)] px-2.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:hidden"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
        <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-48 md:w-56 lg:w-52 xl:w-60 2xl:h-10 2xl:w-72">
          <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle 2xl:h-4 2xl:w-4" />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search site or sub-org…"
            className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0 sm:text-sm 2xl:text-base"
          />
        </div>

        {/* Nothing to choose between with a single sub-org in scope. */}
        {subOrgOptions.length > 1 && (
          <SearchableFilterDropdown
            label="Sub-organization"
            allLabel="All sub-orgs"
            value={subOrgId}
            options={subOrgOptions.map((o) => ({ value: o.value, label: o.label }))}
            onChange={onSubOrgChange}
          />
        )}

        <RemoteSearchSelect variant="filter" label="Sites" allLabel="All sites" value={site} onChange={onSiteChange} load={loadSiteOptions} />

        {canAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="hidden h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:inline-flex sm:text-sm 2xl:h-10 2xl:px-4 2xl:text-base"
          >
            <Plus className="h-3.5 w-3.5 2xl:h-4 2xl:w-4" />
            <span className="hidden md:inline">New Mapping</span>
            <span className="md:hidden">Add</span>
          </button>
        )}
      </div>
    </div>
  );
}
