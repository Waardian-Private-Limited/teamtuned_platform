'use client';

import React from 'react';
import { Filter, Search, Users, X } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { useFilterOptions } from '../../hooks/useFilterOptions';
import type { TrackingFilters as Filters } from '../../types/tracking.dto';

export const ENABLED_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'on', label: 'Tracked' },
  { value: 'off', label: 'Not tracked' },
] as const;

export type EnabledFilter = (typeof ENABLED_OPTIONS)[number]['value'];

interface TrackingAssignmentsToolbarProps {
  total: number;
  trackedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  enabled: EnabledFilter;
  onEnabledChange: (value: EnabledFilter) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const selectClass =
  'h-8.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';

export function TrackingAssignmentsToolbar({
  total,
  trackedCount,
  searchValue,
  onSearchChange,
  enabled,
  onEnabledChange,
  filters,
  onFiltersChange,
}: TrackingAssignmentsToolbarProps) {
  const { departments, roles, sites } = useFilterOptions();
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);

  const hasActiveAdvancedFilters = Boolean(
    filters.departmentId || filters.roleId || filters.siteId || filters.subOrgId
  );

  const clearAdvancedFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Title and stats pill */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-fg-muted" />
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg">
              Employee Assignments
            </h1>
          </div>
          <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted">
            {total} Total
          </span>
          <span className="hidden sm:inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg">
            {trackedCount} Tracked
          </span>
        </div>

        {/* Search & Enabled Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative flex h-8.5 w-full sm:w-56 md:w-64 items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)]">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
            <input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search employee or ID…"
              className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0 sm:text-sm"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="shrink-0 p-0.5 text-fg-subtle hover:text-fg"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Segmented Control */}
          <div className="w-full sm:w-auto">
            <SegmentedControl
              options={ENABLED_OPTIONS}
              value={enabled}
              onChange={onEnabledChange}
            />
          </div>

          {/* Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className={`inline-flex h-8.5 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
              hasActiveAdvancedFilters || showAdvancedFilters
                ? 'border-line-strong bg-bg-subtle text-fg'
                : 'border-line bg-surface text-fg-muted hover:bg-bg-subtle hover:text-fg'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
            {hasActiveAdvancedFilters && (
              <span className="h-1.5 w-1.5 rounded-full bg-fg" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Advanced Filters */}
      {showAdvancedFilters && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line/60 pt-2.5 mt-0.5">
          <SubOrgFilter
            value={filters.subOrgId ?? null}
            onChange={(subOrgId) => onFiltersChange({ ...filters, subOrgId })}
          />

          <select
            aria-label="All departments"
            className={selectClass}
            value={filters.departmentId ?? ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                departmentId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          <select
            aria-label="All roles"
            className={selectClass}
            value={filters.roleId ?? ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                roleId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            aria-label="All sites"
            className={selectClass}
            value={filters.siteId ?? ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                siteId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {hasActiveAdvancedFilters && (
            <button
              type="button"
              onClick={clearAdvancedFilters}
              className="inline-flex h-8.5 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:text-[var(--tt-danger)] transition-colors"
            >
              <X className="h-3 w-3" /> Reset filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
