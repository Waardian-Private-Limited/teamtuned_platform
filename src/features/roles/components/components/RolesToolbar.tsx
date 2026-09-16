'use client';

import { Plus, Search, Layers, ChevronDown } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Tooltip } from '@/components/ui/Tooltip';
import { ROLE_STATUS_FILTER_OPTIONS, type RoleStatusFilter } from '../../constants/roles.constants';

interface DepartmentOption {
  id: number;
  name: string;
}

interface RolesToolbarProps {
  total: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  status: RoleStatusFilter;
  onStatusChange: (value: RoleStatusFilter) => void;
  departments: DepartmentOption[];
  departmentId: number | null;
  onDepartmentChange: (id: number | null) => void;
  canAdd: boolean;
  onAdd: () => void;
  canBulk: boolean;
  onBulk: () => void;
}

export function RolesToolbar({
  total,
  searchValue,
  onSearchChange,
  status,
  onStatusChange,
  departments,
  departmentId,
  onDepartmentChange,
  canAdd,
  onAdd,
  canBulk,
  onBulk,
}: RolesToolbarProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4 2xl:p-4">
      <div className="flex items-center justify-between gap-3 lg:justify-start">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Roles</h1>
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
            placeholder="Search roles…"
            className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0 sm:text-sm 2xl:text-base"
          />
        </div>

        {departments.length > 0 && (
          <div className="relative w-full sm:w-40 md:w-44 2xl:w-52">
            <select
              value={departmentId ?? ''}
              onChange={(e) => onDepartmentChange(e.target.value ? Number(e.target.value) : null)}
              className="h-9 w-full appearance-none rounded-lg border border-line bg-surface pl-3 pr-8 text-xs text-fg outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] cursor-pointer sm:text-sm 2xl:h-10 2xl:pr-9 2xl:text-base"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted 2xl:right-3 2xl:h-4 2xl:w-4" />
          </div>
        )}

        <div className="w-full sm:w-44 md:w-48 lg:w-44 xl:w-48 2xl:w-56">
          <SegmentedControl options={ROLE_STATUS_FILTER_OPTIONS} value={status} onChange={onStatusChange} />
        </div>

        {canBulk && (
          <Tooltip content="Apply permission sets to many roles at once">
            <button
              type="button"
              onClick={onBulk}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg shadow-xs transition-colors hover:bg-bg-subtle sm:text-sm 2xl:h-10 2xl:px-4 2xl:text-base"
            >
              <Layers className="h-3.5 w-3.5 2xl:h-4 2xl:w-4" />
              <span className="hidden md:inline">Bulk permissions</span>
              <span className="md:hidden">Bulk</span>
            </button>
          </Tooltip>
        )}

        {canAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="hidden h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:inline-flex sm:text-sm 2xl:h-10 2xl:px-4 2xl:text-base"
          >
            <Plus className="h-3.5 w-3.5 2xl:h-4 2xl:w-4" />
            <span className="hidden md:inline">New Role</span>
            <span className="md:hidden">Add</span>
          </button>
        )}
      </div>
    </div>
  );
}
