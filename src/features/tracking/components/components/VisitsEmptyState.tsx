'use client';

import { RotateCcw } from 'lucide-react';

interface VisitsEmptyStateProps {
  status?: string;
  isFiltered?: boolean;
  onClear?: () => void;
}

export function VisitsEmptyState({
  status,
  isFiltered,
  onClear,
}: VisitsEmptyStateProps) {
  let title = 'No field visits recorded';
  let description =
    'Field visits recorded by employees will appear here for route review, distance validation and travel allowance approvals.';

  if (isFiltered) {
    if (status && status !== '') {
      const label =
        status === 'submitted'
          ? 'pending review'
          : status === 'approved'
          ? 'approved'
          : status === 'rejected'
          ? 'rejected'
          : status;
      title = `No ${label} field visits`;
      description = `There are currently no field visits marked as ${label} in this period.`;
    } else {
      title = 'No matching field visits';
      description = 'No visits match your current date range or search filters.';
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6 lg:p-8 2xl:p-12 text-center transition-opacity duration-150">
      <div className="mb-3.5 sm:mb-4 2xl:mb-6 w-44 sm:w-56 md:w-64 2xl:w-72 select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/vectors/fieldvisit.svg"
          alt="Field visits illustration"
          width={884}
          height={478}
          className="h-auto w-full object-contain"
        />
      </div>

      <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base md:text-lg 2xl:text-xl">
        {title}
      </h3>
      <p className="mt-1 max-w-xs sm:max-w-sm 2xl:max-w-md text-xs leading-relaxed text-fg-muted sm:text-sm">
        {description}
      </p>

      {isFiltered && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3.5 sm:mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg shadow-xs transition-colors hover:bg-bg-subtle active:scale-[0.98] sm:text-sm"
        >
          <RotateCcw className="h-3.5 w-3.5 text-fg-muted" />
          <span>Clear filters</span>
        </button>
      )}
    </div>
  );
}
