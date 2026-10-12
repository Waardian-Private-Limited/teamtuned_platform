'use client';

import { Plus, Search } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { MonthStepper } from '@/features/salary-slips/components/components/MonthStepper';
import { DEDUCTION_STATUS_FILTER_OPTIONS, type DeductionStatusFilter } from '../../constants/otherDeductions.constants';

interface DeductionsToolbarProps {
  total: number;
  month: string;
  onMonthChange: (month: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  status: DeductionStatusFilter;
  onStatusChange: (value: DeductionStatusFilter) => void;
  canAdd: boolean;
  onAdd: () => void;
}

export function DeductionsToolbar({
  total,
  month,
  onMonthChange,
  searchValue,
  onSearchChange,
  status,
  onStatusChange,
  canAdd,
  onAdd,
}: DeductionsToolbarProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Other Deductions</h1>
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
        <div className="flex items-center gap-2.5">
          <MonthStepper value={month} onChange={onMonthChange} />
          {canAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="hidden h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:inline-flex sm:text-sm 2xl:h-10 2xl:px-4 2xl:text-base"
            >
              <Plus className="h-3.5 w-3.5 2xl:h-4 2xl:w-4" />
              Add deduction
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] md:w-64 2xl:h-10 2xl:w-80">
          <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search employee or reason…"
            className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm"
          />
        </div>
        <div className="w-full overflow-x-auto tt-scroll-hidden md:w-auto">
          <SegmentedControl options={DEDUCTION_STATUS_FILTER_OPTIONS} value={status} onChange={onStatusChange} fitText />
        </div>
      </div>
    </div>
  );
}
