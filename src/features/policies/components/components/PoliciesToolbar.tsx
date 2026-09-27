'use client';

import { CalendarRange, Plus, Search } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { POLICY_STATUS_FILTER_OPTIONS, type PolicyStatusFilter } from '../../constants/policies.constants';

interface PoliciesToolbarProps {
  title: string;
  total: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  status: PolicyStatusFilter;
  onStatusChange: (value: PolicyStatusFilter) => void;
  canAdd: boolean;
  onAdd: () => void;
  /** Omitted on mounts that have no leave-types route of their own. */
  onOpenLeaveTypes?: () => void;
}

export function PoliciesToolbar({ title, total, searchValue, onSearchChange, status, onStatusChange, canAdd, onAdd, onOpenLeaveTypes }: PoliciesToolbarProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4 2xl:p-4">
      <div className="flex items-center justify-between gap-3 lg:justify-start">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">{title}</h1>
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5 lg:flex-nowrap">
        <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-48 md:w-56 lg:w-52 xl:w-60 2xl:h-10 2xl:w-72">
          <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle 2xl:h-4 2xl:w-4" />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search policies…"
            className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0 sm:text-sm 2xl:text-base"
          />
        </div>

        <div className="w-full sm:w-auto sm:min-w-[280px] lg:min-w-[320px]">
          <SegmentedControl options={POLICY_STATUS_FILTER_OPTIONS} value={status} onChange={onStatusChange} />
        </div>

        {onOpenLeaveTypes && (
          <button
            type="button"
            onClick={onOpenLeaveTypes}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm 2xl:h-10"
          >
            <CalendarRange className="h-3.5 w-3.5" />
            <span>Leave types</span>
          </button>
        )}

        {canAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="hidden h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:inline-flex sm:text-sm 2xl:h-10 2xl:px-4 2xl:text-base"
          >
            <Plus className="h-3.5 w-3.5 2xl:h-4 2xl:w-4" />
            <span className="hidden md:inline">New Policy</span>
            <span className="md:hidden">Add</span>
          </button>
        )}
      </div>
    </div>
  );
}
