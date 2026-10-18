'use client';

import { Plus, Search } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SearchableFilterDropdown, type FilterOption } from '@/components/ui/SearchableFilterDropdown';
import { Switch } from '@/components/ui/Switch';
import { POSITION_STATUS_FILTERS, type PositionStatusFilter } from '../hooks/usePositionList';

interface PositionsToolbarProps {
  total: number;
  searchValue: string;
  onSearchChange: (v: string) => void;
  status: PositionStatusFilter;
  onStatusChange: (v: PositionStatusFilter) => void;
  departments: FilterOption[];
  departmentId: number | null;
  onDepartmentChange: (v: number | null) => void;
  mine: boolean;
  onMineChange: (v: boolean) => void;
  canAdd: boolean;
  onAdd: () => void;
}

export function PositionsToolbar(props: PositionsToolbarProps) {
  const { total, searchValue, onSearchChange, status, onStatusChange, departments, departmentId, onDepartmentChange, mine, onMineChange, canAdd, onAdd } = props;
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 xl:flex-row xl:items-center xl:justify-between xl:gap-4 2xl:p-4">
      <div className="flex items-center justify-between gap-3 xl:justify-start">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Positions</h1>
          <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold tabular-nums text-fg-muted 2xl:text-sm">{total}</span>
        </div>
        {canAdd && (
          <button type="button" onClick={onAdd} className="inline-flex h-8.5 items-center gap-1 rounded-lg bg-[var(--tt-primary)] px-2.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs hover:bg-[var(--tt-primary-hover)] sm:hidden">
            <Plus className="h-3.5 w-3.5" />New
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
        <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-52 xl:w-60">
          <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search positions…"
            aria-label="Search positions"
            className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm"
          />
        </div>
        <SegmentedControl options={POSITION_STATUS_FILTERS} value={status} onChange={onStatusChange} fitText className="w-full overflow-x-auto sm:w-auto" />
        {departments.length > 0 && (
          <SearchableFilterDropdown label="Department" allLabel="All departments" value={departmentId} options={departments} onChange={onDepartmentChange} />
        )}
        <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm">
          <Switch checked={mine} onChange={onMineChange} label="Only my positions" />
          Mine
        </label>
        {canAdd && (
          <button type="button" onClick={onAdd} className="hidden h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs hover:bg-[var(--tt-primary-hover)] sm:inline-flex sm:text-sm">
            <Plus className="h-3.5 w-3.5" />New position
          </button>
        )}
      </div>
    </div>
  );
}
