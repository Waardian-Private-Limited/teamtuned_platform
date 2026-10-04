'use client';

import { Plus, RotateCcw } from 'lucide-react';

interface Props { year: number; filtered: boolean; canAdd: boolean; onAdd: () => void; onClear: () => void }

export function HolidaysEmptyState({ year, filtered, canAdd, onAdd, onClear }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 w-36 select-none sm:w-44 lg:w-52 2xl:w-64">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/vectors/holiday.svg" alt="" className="h-auto w-full object-contain" />
      </div>
      <h3 className="text-base font-bold tracking-tight text-fg 2xl:text-2xl">{filtered ? 'No matching holidays' : `No holidays in ${year}`}</h3>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">
        {filtered ? 'Try a different search or clear the filters.' : 'Add the days your teams are off. Holidays can apply to the whole organization, one sub-organization or selected sites, as a full or half day.'}
      </p>
      {filtered ? (
        <button type="button" onClick={onClear} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-4 text-sm font-semibold text-fg hover:bg-bg-subtle">
          <RotateCcw className="h-4 w-4 text-fg-muted" /> Clear filters
        </button>
      ) : canAdd ? (
        <button type="button" onClick={onAdd} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]">
          <Plus className="h-4 w-4" /> New holiday
        </button>
      ) : null}
    </div>
  );
}
