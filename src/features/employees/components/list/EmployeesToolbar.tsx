'use client';

import { Plus, Search, Settings2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { STATUS_FILTERS, type StatusFilter } from '../../constants/employees.constants';
import type { EmployeeListResponseDto } from '../../types/employees.dto';

interface EmployeesToolbarProps {
  counts: EmployeeListResponseDto['counts'];
  searchValue: string;
  onSearchChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  subOrgId: number | null;
  onSubOrgChange: (value: number | null) => void;
  canAdd: boolean;
  onAdd: () => void;
  onSettings?: () => void;
}

export function EmployeesToolbar({
  counts, searchValue, onSearchChange, status, onStatusChange, subOrgId, onSubOrgChange, canAdd, onAdd, onSettings,
}: EmployeesToolbarProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="flex items-center justify-between gap-3 lg:justify-start">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Employees</h1>
            <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted 2xl:text-sm">
              {counts.all}
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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5 lg:flex-nowrap">
          <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-56 md:w-64 xl:w-72 2xl:h-10 2xl:w-80">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle 2xl:h-4 2xl:w-4" />
            <input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search name, code, email, phone…"
              className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0 sm:text-sm 2xl:text-base"
            />
          </div>
          <SubOrgFilter value={subOrgId} onChange={onSubOrgChange} />
          {onSettings && (
            <button type="button" onClick={onSettings} aria-label="Employee settings" className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm 2xl:h-10">
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Settings</span>
            </button>
          )}
          {canAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="hidden h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:inline-flex sm:text-sm 2xl:h-10 2xl:px-4 2xl:text-base"
            >
              <Plus className="h-3.5 w-3.5 2xl:h-4 2xl:w-4" />
              <span className="hidden md:inline">New Employee</span>
              <span className="md:hidden">Add</span>
            </button>
          )}
        </div>
      </div>

      <div role="tablist" className="-mx-1 flex gap-1 overflow-x-auto px-1 tt-scroll-hidden">
        {STATUS_FILTERS.map((f) => {
          const active = status === f.value;
          const count = f.value === 'all' ? counts.all : counts[f.value];
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onStatusChange(f.value)}
              className={cx(
                'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors 2xl:h-9 2xl:text-sm',
                active ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line bg-surface text-fg-muted hover:bg-bg-subtle hover:text-fg'
              )}
            >
              {f.label}
              <span className={cx('rounded px-1 text-[10px] 2xl:text-xs', active ? 'bg-[var(--tt-on-primary)]/20' : 'bg-bg-subtle')}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
