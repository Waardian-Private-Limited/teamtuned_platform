'use client';

import { Calendar, RotateCcw } from 'lucide-react';

interface DaySummariesEmptyStateProps {
  isFiltered?: boolean;
  isToday?: boolean;
  onClear?: () => void;
  onToday?: () => void;
}

export function DaySummariesEmptyState({
  isFiltered,
  isToday,
  onClear,
  onToday,
}: DaySummariesEmptyStateProps) {
  let title = 'No tracking recorded on this date';
  let description =
    'Active shifts, field movements, and stop durations will appear here once employees begin tracking.';
  let buttonLabel = 'Go to Today';

  if (isFiltered) {
    title = 'No matching tracking records';
    description = 'No employee tracking summaries match the selected filters. Try broadening your criteria.';
    buttonLabel = 'Clear filters';
  } else if (!isToday) {
    title = 'No tracking data for this day';
    description = 'There is no recorded location activity or movement logged for this specific calendar date.';
    buttonLabel = 'Jump to Today';
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6 lg:p-8 2xl:p-12 text-center transition-opacity duration-150">
      <div className="mb-3.5 sm:mb-4 2xl:mb-6 w-36 sm:w-44 md:w-52 2xl:w-64 select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/vectors/daysummary.svg"
          alt="Day summary illustration"
          width={682}
          height={800}
          className="h-auto w-full object-contain"
        />
      </div>

      <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base md:text-lg 2xl:text-xl">
        {title}
      </h3>
      <p className="mt-1 max-w-xs sm:max-w-sm 2xl:max-w-md text-xs leading-relaxed text-fg-muted sm:text-sm">
        {description}
      </p>

      {isFiltered ? (
        onClear && (
          <button
            type="button"
            onClick={onClear}
            className="mt-3.5 sm:mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg shadow-xs transition-colors hover:bg-bg-subtle active:scale-[0.98] sm:text-sm"
          >
            <RotateCcw className="h-3.5 w-3.5 text-fg-muted" />
            <span>{buttonLabel}</span>
          </button>
        )
      ) : !isToday && onToday ? (
        <button
          type="button"
          onClick={onToday}
          className="mt-3.5 sm:mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:text-sm"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>{buttonLabel}</span>
        </button>
      ) : null}
    </div>
  );
}
