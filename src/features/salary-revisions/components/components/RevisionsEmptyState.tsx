'use client';

import Image from 'next/image';
import { Plus, RotateCcw } from 'lucide-react';

export function RevisionsEmptyState({ filtered, canAdd, onAdd, onClear }: { filtered: boolean; canAdd: boolean; onAdd: () => void; onClear: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 text-center sm:p-6 lg:p-8 2xl:p-12">
      <div className="mb-3.5 w-32 select-none sm:mb-4 sm:w-40 md:w-44 lg:w-52 2xl:mb-6 2xl:w-64">
        <Image src="/vectors/credit.svg" alt="Salary revisions illustration" width={600} height={500} unoptimized priority className="h-auto w-full object-contain" />
      </div>
      <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base md:text-lg 2xl:text-2xl">{filtered ? 'No matching revisions' : 'Record your first increment'}</h3>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-fg-muted sm:max-w-sm sm:text-sm 2xl:max-w-md 2xl:text-base">
        {filtered
          ? 'Nothing matches these filters. Clear them to see every revision.'
          : 'Increments, promotions and corrections with effective dates, approvals, arrears and letters. Every change stays in the salary history.'}
      </p>
      {filtered ? (
        <button type="button" onClick={onClear} className="mt-3.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg shadow-xs transition-colors hover:bg-bg-subtle sm:mt-4 sm:text-sm 2xl:h-11 2xl:px-6 2xl:text-base">
          <RotateCcw className="h-3.5 w-3.5 text-fg-muted" />
          <span>Clear filters</span>
        </button>
      ) : (
        canAdd && (
          <button type="button" onClick={onAdd} className="mt-3.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] sm:mt-4 sm:text-sm 2xl:h-11 2xl:px-6 2xl:text-base">
            <Plus className="h-3.5 w-3.5" />
            <span>New Revision</span>
          </button>
        )
      )}
    </div>
  );
}
