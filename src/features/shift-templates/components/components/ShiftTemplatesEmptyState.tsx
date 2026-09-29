'use client';

import { Plus, RotateCcw } from 'lucide-react';
import type { ShiftStatusFilter } from '../../constants/shiftTemplates.constants';

interface ShiftTemplatesEmptyStateProps {
  status: ShiftStatusFilter;
  searchTerm: string;
  canAdd: boolean;
  onAdd: () => void;
  onClear: () => void;
}

export function ShiftTemplatesEmptyState({ status, searchTerm, canAdd, onAdd, onClear }: ShiftTemplatesEmptyStateProps) {
  const isSearchFiltered = Boolean(searchTerm.trim());
  const isFiltered = isSearchFiltered || status !== 'all';

  let title = 'Create your first shift';
  let description = 'Shifts are named timings — General, Morning, Night — that employees are assigned to or rostered on.';
  if (isSearchFiltered) {
    title = 'No matching shifts';
    description = `No shifts match "${searchTerm}". Try adjusting your search.`;
  } else if (isFiltered) {
    title = status === 'active' ? 'No active shifts' : 'No inactive shifts';
    description = `There are currently no ${status} shifts in your organization.`;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 text-center sm:p-6 lg:p-8 2xl:p-12">
      <div className="mb-3.5 w-32 select-none sm:mb-4 sm:w-40 md:w-44 lg:w-52 2xl:mb-6 2xl:w-64">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/vectors/shift.svg" alt="Shifts illustration" className="h-auto w-full object-contain" />
      </div>

      <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base md:text-lg 2xl:text-2xl">{title}</h3>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-fg-muted sm:max-w-sm sm:text-sm 2xl:max-w-md 2xl:text-base">{description}</p>

      {!isFiltered ? (
        canAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="mt-3.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:mt-4 sm:h-9.5 sm:text-sm 2xl:mt-6 2xl:h-11 2xl:px-6 2xl:text-base"
          >
            <Plus className="h-3.5 w-3.5 2xl:h-4 2xl:w-4" />
            <span>New Shift</span>
          </button>
        )
      ) : (
        <button
          type="button"
          onClick={onClear}
          className="mt-3.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg shadow-xs transition-colors hover:bg-bg-subtle active:scale-[0.98] sm:mt-4 sm:h-9.5 sm:text-sm 2xl:mt-6 2xl:h-11 2xl:px-6 2xl:text-base"
        >
          <RotateCcw className="h-3.5 w-3.5 text-fg-muted 2xl:h-4 2xl:w-4" />
          <span>{isSearchFiltered ? 'Clear search' : 'Clear filters'}</span>
        </button>
      )}
    </div>
  );
}
