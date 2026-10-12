'use client';

import { Download, Search, X } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SearchableFilterDropdown, type FilterOption } from '@/components/ui/SearchableFilterDropdown';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { PAYOUT_TABS, SOURCE_OPTIONS } from '../../constants/payouts.constants';
import type { PayoutFilters, PayoutTab } from '../../types/payouts.model';

interface Props {
  total: number;
  filters: PayoutFilters;
  onChange: (patch: Partial<PayoutFilters>) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  sites: FilterOption[];
  canPay: boolean;
  onBankSheet: () => void;
}

export function PayoutsToolbar({ total, filters, onChange, searchValue, onSearchChange, sites, canPay, onBankSheet }: Props) {
  const sourceValue = SOURCE_OPTIONS.find((o) => o.source === filters.source)?.value ?? null;
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Payouts</h1>
          <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold tabular-nums text-fg-muted 2xl:text-sm">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <SubOrgFilter value={filters.subOrgId} onChange={(subOrgId) => onChange({ subOrgId })} />
          {canPay && (
            <button
              type="button"
              onClick={onBankSheet}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm 2xl:h-10"
            >
              <Download className="h-3.5 w-3.5" />
              Bank sheet
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="w-full overflow-x-auto tt-scroll-hidden xl:w-auto">
          <SegmentedControl<PayoutTab> options={PAYOUT_TABS} value={filters.tab} onChange={(tab) => onChange({ tab })} fitText />
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center xl:flex-nowrap">
          <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] md:w-56 2xl:h-10 2xl:w-64">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
            <input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search name or code…"
              aria-label="Search name or code"
              className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm"
            />
            {searchValue && (
              <button type="button" aria-label="Clear search" onClick={() => onSearchChange('')} className="text-fg-subtle hover:text-fg">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 md:flex">
            <SearchableFilterDropdown
              label="For"
              allLabel="Everything"
              value={sourceValue}
              options={SOURCE_OPTIONS.map(({ value, label }) => ({ value, label }))}
              onChange={(v) => onChange({ source: SOURCE_OPTIONS.find((o) => o.value === v)?.source ?? null })}
              className="md:w-36"
            />
            <SearchableFilterDropdown label="Site" allLabel="All sites" value={filters.siteId} options={sites} onChange={(siteId) => onChange({ siteId })} className="md:w-36" />
            <input
              type="month"
              aria-label="Month"
              value={filters.month}
              onChange={(e) => onChange({ month: e.target.value })}
              className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs text-fg outline-none focus:border-[var(--tt-primary)] sm:text-sm md:w-40 2xl:h-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
