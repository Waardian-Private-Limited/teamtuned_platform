'use client';

import { Plus, RotateCcw } from 'lucide-react';
import type { SubOrgStatusFilter } from '../../constants/sub-organizations.constants';

interface SubOrganizationsEmptyStateProps {
  status?: SubOrgStatusFilter;
  canAdd?: boolean;
  onAdd?: () => void;
  searchTerm?: string;
  onClear?: () => void;
}

export function SubOrganizationsEmptyState({
  status = 'all',
  canAdd,
  onAdd,
  searchTerm,
  onClear,
}: SubOrganizationsEmptyStateProps) {
  const isSearchFiltered = Boolean(searchTerm?.trim());
  const isStatusFiltered = status !== 'all';
  const isFiltered = isSearchFiltered || isStatusFiltered;

  let title = 'Add your first sub-organization';
  let description =
    'Sub-organizations are the separate legal entities inside your company — each with its own GST, its own TAN, and its own name on invoices and Form 16.';
  let buttonLabel = 'New Sub-Organization';

  if (isSearchFiltered) {
    title = 'No matching sub-organizations';
    description = `Nothing matches "${searchTerm}". Try a different name, code or GST number.`;
    buttonLabel = 'Clear search';
  } else if (isStatusFiltered) {
    title = status === 'active' ? 'No active sub-organizations' : 'No inactive sub-organizations';
    description =
      status === 'active'
        ? 'There are currently no active sub-organizations in your organization.'
        : 'There are currently no inactive sub-organizations in your organization.';
    buttonLabel = 'Clear filters';
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6 lg:p-8 2xl:p-12 text-center transition-opacity duration-150">
      <div className="mb-3.5 sm:mb-4 2xl:mb-6 w-32 sm:w-40 md:w-44 lg:w-52 2xl:w-64 select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/vectors/sub-organizations.svg"
          alt="Sub-organizations illustration"
          width={911}
          height={705}
          className="h-auto w-full object-contain"
        />
      </div>

      <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base md:text-lg 2xl:text-2xl">{title}</h3>
      <p className="mt-1 max-w-xs sm:max-w-sm 2xl:max-w-md text-xs leading-relaxed text-fg-muted sm:text-sm 2xl:text-base">
        {description}
      </p>

      {!isFiltered ? (
        canAdd && onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="mt-3.5 sm:mt-4 2xl:mt-6 inline-flex h-9 sm:h-9.5 2xl:h-11 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 2xl:px-6 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:text-sm 2xl:text-base"
          >
            <Plus className="h-3.5 w-3.5 2xl:h-4 2xl:w-4" />
            <span>{buttonLabel}</span>
          </button>
        )
      ) : (
        onClear && (
          <button
            type="button"
            onClick={onClear}
            className="mt-3.5 sm:mt-4 2xl:mt-6 inline-flex h-9 sm:h-9.5 2xl:h-11 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 2xl:px-6 text-xs font-semibold text-fg shadow-xs transition-colors hover:bg-bg-subtle active:scale-[0.98] sm:text-sm 2xl:text-base"
          >
            <RotateCcw className="h-3.5 w-3.5 2xl:h-4 2xl:w-4 text-fg-muted" />
            <span>{buttonLabel}</span>
          </button>
        )
      )}
    </div>
  );
}
