'use client';

import { Calendar, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { todayInput } from '../../constants/tracking.constants';
import type { TrackingFilters as Filters } from '../../types/tracking.dto';
import { TrackingFilters } from '../TrackingFilters';

interface DaySummariesToolbarProps {
  total: number;
  date: string;
  onDateChange: (date: string) => void;
  searchValue: string;
  onSearchChange: (search: string) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function DaySummariesToolbar({
  total,
  date,
  onDateChange,
  searchValue,
  onSearchChange,
  filters,
  onFiltersChange,
}: DaySummariesToolbarProps) {
  const isToday = date === todayInput();

  const stepDate = (offsetDays: number) => {
    const current = new Date(date);
    if (Number.isNaN(current.getTime())) return;
    current.setDate(current.getDate() + offsetDays);
    const nextDate = current.toLocaleDateString('en-CA');
    if (nextDate <= todayInput()) {
      onDateChange(nextDate);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4 2xl:p-4">
      {/* Title & Total Badge */}
      <div className="flex items-center justify-between gap-3 lg:justify-start">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">
            Daily Summaries
          </h1>
          <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted 2xl:text-sm">
            {total}
          </span>
        </div>
      </div>

      {/* Date Navigation, Search & Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
        {/* Date Stepper Controls */}
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => stepDate(-1)}
            title="Previous day"
            className="flex h-8 w-7 items-center justify-center rounded text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg active:scale-95"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <div className="relative flex items-center">
            <Calendar className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-fg-muted" />
            <input
              type="date"
              aria-label="Filter date"
              value={date}
              max={todayInput()}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
              className="h-8 rounded bg-transparent pl-7 pr-1.5 text-xs font-semibold text-fg outline-none sm:text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => stepDate(1)}
            disabled={isToday}
            title="Next day"
            className="flex h-8 w-7 items-center justify-center rounded text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {!isToday && (
            <button
              type="button"
              onClick={() => onDateChange(todayInput())}
              className="h-6.5 rounded bg-bg-subtle px-2 text-[10px] font-semibold text-fg transition-colors hover:bg-line active:scale-95"
            >
              Today
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-44 md:w-48 lg:w-48 xl:w-56">
          <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search employee…"
            className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0 sm:text-sm"
          />
        </div>

        {/* Narrowing Filters: Sub-org, Department, Role, Site */}
        <TrackingFilters value={filters} onChange={onFiltersChange} />
      </div>
    </div>
  );
}
