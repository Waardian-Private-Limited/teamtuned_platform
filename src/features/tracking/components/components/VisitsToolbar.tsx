'use client';

import { Download, Search } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

interface VisitsToolbarProps {
  total: number;
  status: string;
  onStatusChange: (status: string) => void;
  from: string;
  onFromChange: (date: string) => void;
  to: string;
  onToChange: (date: string) => void;
  searchValue: string;
  onSearchChange: (search: string) => void;
  onExportCsv: () => void;
  hasRows: boolean;
}

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'To review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' },
] as const;

export function VisitsToolbar({
  total,
  status,
  onStatusChange,
  from,
  onFromChange,
  to,
  onToChange,
  searchValue,
  onSearchChange,
  onExportCsv,
  hasRows,
}: VisitsToolbarProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4 2xl:p-4">
      {/* Title & Total Badge */}
      <div className="flex items-center justify-between gap-3 lg:justify-start">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">
            Field Visits
          </h1>
          <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted 2xl:text-sm">
            {total}
          </span>
        </div>
      </div>

      {/* Controls & Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
        {/* Status Tabs */}
        <div className="w-full sm:w-auto">
          <SegmentedControl
            fitText
            options={STATUS_OPTIONS}
            value={status}
            onChange={onStatusChange}
          />
        </div>

        {/* Date Range Inputs */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="Start date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg outline-none transition-colors focus:border-[var(--tt-primary)] sm:text-sm"
          />
          <span className="text-xs text-fg-muted">to</span>
          <input
            type="date"
            aria-label="End date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg outline-none transition-colors focus:border-[var(--tt-primary)] sm:text-sm"
          />
        </div>

        {/* Search */}
        <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-44 md:w-48 lg:w-48">
          <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search employee…"
            className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0 sm:text-sm"
          />
        </div>

        {/* Export CSV Button */}
        <button
          type="button"
          onClick={onExportCsv}
          disabled={!hasRows}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg shadow-xs transition-colors hover:bg-bg-subtle active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
        >
          <Download className="h-3.5 w-3.5 text-fg-muted" />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
}
