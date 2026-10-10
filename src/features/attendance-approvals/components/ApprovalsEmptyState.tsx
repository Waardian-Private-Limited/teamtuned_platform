'use client';

import { RotateCcw } from 'lucide-react';

/** What an empty list means here, with the approvals illustration and a way out of the filters. */
export function ApprovalsEmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  const title = filtered ? 'Nothing matches these filters' : 'You are all caught up';
  const description = filtered ? 'Try another status, date range or site.' : 'Regularization requests that need your decision show up here.';
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center lg:p-10">
      <div className="mb-4 w-36 select-none sm:w-44 lg:w-52">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/vectors/approvals.svg" alt="" width={602} height={651} className="h-auto w-full object-contain" />
      </div>
      <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base lg:text-lg">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-fg-muted sm:text-sm">{description}</p>
      {filtered && (
        <button type="button" onClick={onClear} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3.5 text-sm font-semibold text-fg hover:bg-bg-subtle">
          <RotateCcw className="h-4 w-4" /> Clear filters
        </button>
      )}
    </div>
  );
}
