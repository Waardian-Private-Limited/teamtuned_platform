'use client';

import { RotateCcw } from 'lucide-react';

const COPY: Record<string, { title: string; description: string }> = {
  '': {
    title: 'No onboarding submissions yet',
    description: 'When invited employees fill in their onboarding form and submit it, it appears here for you to review.',
  },
  submitted: {
    title: 'Nothing waiting for review',
    description: 'You are all caught up. New submissions from invited employees will show up here.',
  },
  changes_requested: {
    title: 'No changes requested',
    description: 'No submission is currently sent back to an employee for changes.',
  },
  approved: {
    title: 'No approved onboardings',
    description: 'Submissions you approve will be listed here.',
  },
};

export function OnboardingReviewEmptyState({
  status,
  searchTerm = '',
  onClear,
}: {
  status: string;
  searchTerm?: string;
  onClear?: () => void;
}) {
  const isSearch = searchTerm.trim() !== '';
  const isFiltered = isSearch || status !== '';
  const { title, description } = isSearch
    ? { title: 'No matching employees', description: `Nobody matches "${searchTerm}". Search by name, email, phone or employee code.` }
    : COPY[status] ?? COPY[''];

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6 lg:p-8 2xl:p-12 text-center transition-opacity duration-150">
      <div className="mb-3.5 sm:mb-4 2xl:mb-6 w-28 sm:w-32 md:w-36 lg:w-40 2xl:w-52 select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/vectors/review.svg"
          alt="Onboarding review illustration"
          width={576}
          height={800}
          className="h-auto w-full object-contain"
        />
      </div>

      <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base md:text-lg 2xl:text-2xl">{title}</h3>
      <p className="mt-1 max-w-xs sm:max-w-sm 2xl:max-w-md text-xs leading-relaxed text-fg-muted sm:text-sm 2xl:text-base">{description}</p>

      {isFiltered && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3.5 sm:mt-4 2xl:mt-6 inline-flex h-9 sm:h-9.5 2xl:h-11 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 2xl:px-6 text-xs font-semibold text-fg shadow-xs transition-colors hover:bg-bg-subtle active:scale-[0.98] sm:text-sm 2xl:text-base"
        >
          <RotateCcw className="h-3.5 w-3.5 2xl:h-4 2xl:w-4 text-fg-muted" />
          <span>{isSearch ? 'Clear search' : 'Show all'}</span>
        </button>
      )}
    </div>
  );
}
