'use client';

import { Search, X } from 'lucide-react';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import { DateRange } from '@/features/expense-bills/components/DateRange';
import { PAYMENT_MODES } from '@/features/expense-bills/constants/bill.constants';
import type { PaymentMode } from '@/features/expense-bills/types/bill.model';
import { MY_PHYSICAL_FILTERS, PHYSICAL_FILTERS } from '../../constants/petty-cash.constants';
import { useFilterLists } from '../../hooks/useFilterLists';
import type { useExpenseList } from '../../hooks/useExpenseList';
import type { ExpenseFilters } from '../../types/petty-cash.model';

const select = 'h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm md:w-40';
const amountInput = 'h-9 w-full min-w-0 rounded-lg border border-line bg-surface px-2 text-xs text-fg placeholder:text-fg-subtle sm:text-sm md:w-24';

interface Props {
  list: ReturnType<typeof useExpenseList>;
  scope: 'hr' | 'me';
  /** Which extra filters to offer. */
  show?: { site?: boolean; physical?: boolean; amount?: boolean; flagged?: boolean; paymentMode?: boolean };
  searchPlaceholder?: string;
}

/** Search and the filter row shared by the expense list, the inward register and the employee's own list. */
export function ExpenseSearch({ list, searchPlaceholder = 'Search number, merchant or name…' }: { list: Props['list']; searchPlaceholder?: string }) {
  return (
    <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] xl:w-64 2xl:h-10">
        <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
        <input
          value={list.searchInput}
          onChange={(e) => list.setSearchInput(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Search expenses"
          className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm"
        />
        {list.searchInput && (
          <button type="button" aria-label="Clear search" onClick={() => list.setSearchInput('')} className="text-fg-subtle hover:text-fg">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
  );
}

export function ExpenseFilterControls({ list, scope, show = {} }: Omit<Props, 'searchPlaceholder'>) {
  const lists = useFilterLists(scope);
  const f = list.filters;
  const { site = scope === 'hr', physical = scope === 'hr', amount = scope === 'hr', flagged = scope === 'hr', paymentMode = true } = show;
  const set = (patch: Partial<ExpenseFilters>) => list.update(patch);
  return (
    <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
      <SearchableFilterDropdown label="Wallet" allLabel="All wallets" value={f.walletId} options={lists.wallets} onChange={(walletId) => set({ walletId })} className="md:w-44" />
      {site && <SearchableFilterDropdown label="Site" allLabel="All sites" value={f.siteId} options={lists.sites} onChange={(siteId) => set({ siteId })} className="md:w-44" />}
      <SearchableFilterDropdown label="Category" allLabel="All categories" value={f.categoryId} options={lists.categories} onChange={(categoryId) => set({ categoryId })} className="md:w-44" />
      {paymentMode && (
        <select aria-label="Paid by" value={f.paymentMode ?? ''} onChange={(e) => set({ paymentMode: (e.target.value || null) as PaymentMode | null })} className={select}>
          <option value="">Any payment</option>
          {PAYMENT_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      )}
      {physical && (
        <select aria-label="Paper bill" value={f.physical ?? ''} onChange={(e) => set({ physical: (e.target.value || null) as ExpenseFilters['physical'] })} className={select}>
          {(scope === 'me' ? MY_PHYSICAL_FILTERS : PHYSICAL_FILTERS).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      <div className="col-span-2 md:col-span-1">
        <DateRange value={{ from: f.from, to: f.to }} onChange={(v) => set({ from: v.from, to: v.to })} />
      </div>
      {amount && (
        <div className="col-span-2 flex items-center gap-1.5 md:col-span-1">
          <input type="number" inputMode="decimal" min={0} aria-label="Smallest amount" placeholder="Min ₹" value={f.minAmount} onChange={(e) => set({ minAmount: e.target.value })} className={amountInput} />
          <span className="text-xs text-fg-muted">to</span>
          <input type="number" inputMode="decimal" min={0} aria-label="Largest amount" placeholder="Max ₹" value={f.maxAmount} onChange={(e) => set({ maxAmount: e.target.value })} className={amountInput} />
        </div>
      )}
      {flagged && (
        <button
          type="button"
          aria-pressed={f.flagged}
          onClick={() => set({ flagged: !f.flagged })}
          className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors sm:text-sm ${f.flagged ? 'border-fg bg-fg text-[var(--tt-on-primary)]' : 'border-line bg-surface text-fg hover:bg-bg-subtle'}`}
        >
          Flagged only
        </button>
      )}
      {list.hasActiveFilters && (
        <button type="button" onClick={list.clearFilters} className="text-xs font-semibold text-fg-muted underline-offset-2 hover:text-fg hover:underline">
          Clear filters
        </button>
      )}
    </div>
  );
}
