'use client';

import { Plus, RotateCcw } from 'lucide-react';
import type { TeamStatusFilter } from '../../../hooks/useTeamsList';

interface TeamsEmptyStateProps {
  status?: TeamStatusFilter;
  canAdd?: boolean;
  onAdd?: () => void;
  searchTerm?: string;
  hasSubOrgFilter?: boolean;
  onClear?: () => void;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function TeamsEmptyState({
  status = 'all',
  canAdd,
  onAdd,
  searchTerm,
  hasSubOrgFilter,
  onClear,
  title: customTitle,
  description: customDescription,
  action,
}: TeamsEmptyStateProps) {
  const isSearchFiltered = Boolean(searchTerm?.trim());
  const isStatusFiltered = status !== 'all';
  const isSubOrgFiltered = Boolean(hasSubOrgFilter);
  const isFiltered = isSearchFiltered || isStatusFiltered || isSubOrgFiltered;

  let title = customTitle || 'Create your first team';
  let description =
    customDescription ||
    'A team is any group you schedule together: a site, a ward, a department, or a production line. Teams can sit inside other teams, and members are assigned by filters or individually.';
  let buttonLabel = 'New Team';

  if (!customTitle && isSearchFiltered) {
    title = 'No matching teams';
    description = `No teams match "${searchTerm}". Try adjusting your search query.`;
    buttonLabel = 'Clear search';
  } else if (!customTitle && isSubOrgFiltered) {
    title = 'No teams in this sub-organization';
    description = 'There are currently no teams assigned to the selected sub-organization.';
    buttonLabel = 'Clear filters';
  } else if (!customTitle && isStatusFiltered) {
    title = status === 'active' ? 'No active teams' : 'No inactive teams';
    description =
      status === 'active'
        ? 'There are currently no active teams in your organization.'
        : 'There are currently no inactive teams in your organization.';
    buttonLabel = 'Clear filters';
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6 lg:p-8 2xl:p-12 text-center transition-opacity duration-150">
      {/* Balanced Vector Illustration */}
      <div className="mb-3.5 sm:mb-4 2xl:mb-6 w-32 sm:w-40 md:w-44 lg:w-52 2xl:w-64 select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/vectors/teams.svg"
          alt="Teams illustration"
          width={867}
          height={443}
          className="h-auto w-full object-contain"
        />
      </div>

      {/* Contextual Title & Description */}
      <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base md:text-lg 2xl:text-2xl">{title}</h3>
      <p className="mt-1 max-w-xs sm:max-w-sm 2xl:max-w-md text-xs leading-relaxed text-fg-muted sm:text-sm 2xl:text-base">
        {description}
      </p>

      {/* Action Button: Custom action, Create New Team if unfiltered, otherwise Clear Filters */}
      {action ? (
        action
      ) : !isFiltered ? (
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
