'use client';

import { Plus, Search } from 'lucide-react';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { FilterTabs } from '@/features/compensation/components/shared/FilterTabs';
import { STATUS_FILTERS, TYPE_FILTERS, type StatusFilter } from '../../constants/salaryRevisions.constants';

interface Props {
  total: number;
  counts: Record<string, number>;
  searchValue: string;
  onSearchChange: (v: string) => void;
  status: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
  type: string;
  onTypeChange: (v: string) => void;
  subOrgId: number | null;
  onSubOrgChange: (v: number | null) => void;
  canAdd: boolean;
  onAdd: () => void;
}

const addClass = 'items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98]';

export function RevisionsToolbar({ total, counts, searchValue, onSearchChange, status, onStatusChange, type, onTypeChange, subOrgId, onSubOrgChange, canAdd, onAdd }: Props) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="flex items-center justify-between gap-3 lg:justify-start">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Increments &amp; Promotions</h1>
            <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted 2xl:text-sm">{total}</span>
          </div>
          {canAdd && (
            <button type="button" onClick={onAdd} className={`inline-flex h-8.5 px-2.5 sm:hidden ${addClass}`}>
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5 lg:flex-nowrap">
          <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-52 md:w-60 xl:w-72 2xl:h-10">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
            <input value={searchValue} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search employee or code…" className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm" />
          </div>
          <select value={type} onChange={(e) => onTypeChange(e.target.value)} aria-label="Revision type" className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs text-fg sm:text-sm 2xl:h-10">
            {TYPE_FILTERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <SubOrgFilter value={subOrgId} onChange={onSubOrgChange} />
          {canAdd && (
            <button type="button" onClick={onAdd} className={`hidden h-9 shrink-0 px-3 sm:inline-flex sm:text-sm 2xl:h-10 2xl:px-4 2xl:text-base ${addClass}`}>
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden md:inline">New Revision</span>
              <span className="md:hidden">Add</span>
            </button>
          )}
        </div>
      </div>
      <FilterTabs options={STATUS_FILTERS} value={status} onChange={onStatusChange} counts={counts} />
    </div>
  );
}
