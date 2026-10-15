'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Check, Download, FileClock, Plus, Search, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { usePermission } from '@/lib/hooks/usePermission';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useFilterOptions } from '@/features/payroll-runs/hooks/useFilterOptions';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { CLAIMS_ACCESS, CLAIMS_EXPORT_ACCESS, CLAIM_TABS, ILLUSTRATIONS, PHYSICAL_FILTERS, REIMB_PERMISSIONS } from '../constants/reimbursement.constants';
import { useCategories } from '../hooks/useCategories';
import { useClaimList } from '../hooks/useClaimList';
import { useExpenseFeatures } from '../hooks/useExpenseFeatures';
import { useExpensesBasePath } from '../hooks/useExpensesBasePath';
import { useReceiptScanAvailable } from '../hooks/useReceiptScanAvailable';
import type { Channel, ClaimDetail, ClaimListTab, PayoutMode, PhysicalFilter } from '../types/reimbursement.model';
import { money } from '../utils/format';
import { ClaimCardList } from './components/ClaimCardList';
import { ClaimTable } from './components/ClaimTable';
import { ExpenseFormDrawer } from './components/ExpenseFormDrawer';
import { ExportClaimsDialog, type ClaimExportFilters } from './components/ExportDialogs';
import { BulkCollectDialog } from './components/PaperBill';
import { FeatureOff, NoAccess, primaryBtn, secondaryBtn } from './components/Primitives';

const EMPTY: Record<ClaimListTab, { title: string; description: string }> = {
  pending: { title: 'Nothing waiting for approval', description: 'Submitted expenses appear here until they are decided in Approvals.' },
  to_pay: { title: 'Nothing to pay', description: 'Approved claims that Accounts pays by hand appear here.' },
  approved: { title: 'Nothing approved and unpaid', description: 'Approved claims waiting for Accounts or payroll, and approved wallet expenses, appear here.' },
  paid: { title: 'Nothing paid yet', description: 'Claims paid back by Accounts or with payroll are kept here.' },
  rejected: { title: 'Nothing rejected', description: 'Rejected expenses are kept here with the reason.' },
  cancelled: { title: 'Nothing cancelled', description: 'Withdrawn and cancelled expenses are kept here.' },
  all: { title: 'No expenses yet', description: 'Employees file expenses from their app or the web. HR can also file one for an employee.' },
};

export function ClaimsPage() {
  const f = useExpenseFeatures();
  const { canAny } = usePermission();
  if (!f.any) return <FeatureOff what="Expenses" />;
  if (!canAny(CLAIMS_ACCESS)) return <NoAccess what="expenses" />;
  return <Claims />;
}

function Claims() {
  const router = useRouter();
  const base = useExpensesBasePath();
  const { can, canAny } = usePermission();
  const features = useExpenseFeatures();
  const canSubmit = can(REIMB_PERMISSIONS.SUBMIT);
  const canCollect = can(REIMB_PERMISSIONS.PHYSICAL_COLLECT);
  const canExport = canAny(CLAIMS_EXPORT_ACCESS);
  const list = useClaimList();
  const { categories } = useCategories();
  const { departments } = useFilterOptions(list.filters.subOrgId);
  const [creating, setCreating] = React.useState(false);
  const receiptScan = useReceiptScanAvailable(canSubmit && creating);
  const [exporting, setExporting] = React.useState(false);
  const [collecting, setCollecting] = React.useState(false);
  const [selected, setSelected] = React.useState<ReadonlySet<number>>(() => new Set());
  const numbers = React.useRef(new Map<number, string>());
  const hybrid = features.claims && features.wallet;
  const channels: Channel[] = [...(features.wallet ? (['wallet'] as Channel[]) : []), ...(features.claims ? (['claim'] as Channel[]) : [])];

  const href = React.useCallback((id: number) => `${base}/claims/${id}`, [base]);
  const tabs = CLAIM_TABS.filter((t) => features.claims || !['to_pay', 'paid'].includes(t.value)).map((t) => ({ value: t.value, label: list.counts[t.value] ? `${t.label} ${list.counts[t.value]}` : t.label }));
  const categoryOptions = React.useMemo(() => categories.map((c) => ({ value: c.id, label: c.name })), [categories]);
  const f = list.filters;
  const billsToCollect = list.counts.bills_to_collect ?? 0;

  // A new filter is a new list: drop the checked rows.
  React.useEffect(() => setSelected(new Set()), [f]);
  React.useEffect(() => {
    list.rows.forEach((r) => numbers.current.set(r.id, r.number));
  }, [list.rows]);

  const selection = React.useMemo(
    () =>
      canCollect || canExport
        ? {
            ids: selected,
            toggle: (id: number) =>
              setSelected((s) => {
                const next = new Set(s);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              }),
            setPage: (ids: number[], on: boolean) =>
              setSelected((s) => {
                const next = new Set(s);
                ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
                return next;
              }),
          }
        : undefined,
    [canCollect, canExport, selected]
  );
  const selectedIds = React.useMemo(() => [...selected], [selected]);

  // What the page shows, handed to the export dialog where every filter stays editable.
  const exportInitial: Partial<ClaimExportFilters> = {
    status: f.tab === 'all' ? '' : f.tab,
    channel: f.channel,
    payoutMode: f.payoutMode,
    categoryId: f.categoryId,
    departmentId: f.departmentId,
    physical: f.physical,
    spentFrom: f.from,
    spentTo: f.to,
    search: f.search,
  };

  const onSaved = React.useCallback(
    (d: ClaimDetail) => {
      setCreating(false);
      router.push(href(d.id));
    },
    [router, href]
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Expenses</h1>
            <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold tabular-nums text-fg-muted 2xl:text-sm">{list.total}</span>
            {list.amount > 0 && <span className="hidden text-xs font-semibold tabular-nums text-fg-muted sm:inline">{money(list.amount)}</span>}
            {(billsToCollect > 0 || f.physical === 'pending') && (
              <button
                type="button"
                aria-pressed={f.physical === 'pending'}
                onClick={() => list.update(f.physical === 'pending' ? { physical: null } : { physical: 'pending', tab: 'all' })}
                className={cx(
                  'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold transition-colors sm:text-xs',
                  f.physical === 'pending' ? 'border-fg bg-fg text-[var(--tt-on-primary)]' : 'border-dashed border-fg/60 bg-surface text-fg hover:bg-bg-subtle'
                )}
              >
                <FileClock className="h-3.5 w-3.5" aria-hidden />
                Bills to collect <span className="tabular-nums">{billsToCollect}</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SubOrgFilter value={f.subOrgId} onChange={(subOrgId) => list.update({ subOrgId })} />
            {canExport && (
              <button type="button" onClick={() => setExporting(true)} className={secondaryBtn}>
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            )}
            {canSubmit && (
              <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>
                <Plus className="h-3.5 w-3.5" />
                <span className="sm:hidden">New</span>
                <span className="hidden sm:inline">New expense for employee</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="w-full overflow-x-auto tt-scroll-hidden xl:w-auto">
            <SegmentedControl<ClaimListTab> options={tabs} value={f.tab} onChange={(tab) => list.update({ tab })} fitText />
          </div>
          <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] xl:w-64 2xl:h-10">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
            <input
              value={list.searchInput}
              onChange={(e) => list.setSearchInput(e.target.value)}
              placeholder="Search name, code or title…"
              aria-label="Search expenses"
              className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm"
            />
            {list.searchInput && (
              <button type="button" aria-label="Clear search" onClick={() => list.setSearchInput('')} className="text-fg-subtle hover:text-fg">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
          {hybrid && (
            <select
              aria-label="Paid with"
              value={f.channel ?? ''}
              onChange={(e) => list.update({ channel: (e.target.value || null) as Channel | null })}
              className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm md:w-40"
            >
              <option value="">Claims and wallet</option>
              <option value="claim">Claims</option>
              <option value="wallet">Wallet</option>
            </select>
          )}
          {features.claims && (
            <select
              aria-label="Paid back"
              value={f.payoutMode ?? ''}
              onChange={(e) => list.update({ payoutMode: (e.target.value || null) as PayoutMode | null })}
              className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm md:w-40"
            >
              <option value="">Any payout</option>
              <option value="manual">By Accounts</option>
              <option value="payroll">With payroll</option>
            </select>
          )}
          <select
            aria-label="Paper bill"
            value={f.physical ?? ''}
            onChange={(e) => list.update({ physical: (e.target.value || null) as PhysicalFilter | null })}
            className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm md:w-40"
          >
            {PHYSICAL_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <SearchableFilterDropdown label="Category" allLabel="All categories" value={f.categoryId} options={categoryOptions} onChange={(categoryId) => list.update({ categoryId })} className="md:w-44" />
          <SearchableFilterDropdown label="Department" allLabel="All departments" value={f.departmentId} options={departments} onChange={(departmentId) => list.update({ departmentId })} className="md:w-44" />
          <div className="col-span-2 flex items-center gap-1.5 md:col-span-1">
            <input type="date" aria-label="Spent from" value={f.from} max={f.to || undefined} onChange={(e) => list.update({ from: e.target.value })} className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-xs text-fg sm:text-sm md:w-36 md:flex-none" />
            <span className="text-xs text-fg-muted">to</span>
            <input type="date" aria-label="Spent to" value={f.to} min={f.from || undefined} onChange={(e) => list.update({ to: e.target.value })} className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-xs text-fg sm:text-sm md:w-36 md:flex-none" />
          </div>
          {list.hasActiveFilters && (
            <button type="button" onClick={list.clearFilters} className="text-xs font-semibold text-fg-muted underline-offset-2 hover:text-fg hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {selected.size > 0 && (
          <div className="hidden flex-wrap items-center gap-2 border-b border-line bg-bg-subtle/60 px-4 py-2 md:flex">
            <span className="text-xs font-semibold text-fg sm:text-sm">{selected.size} selected</span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {canCollect && (
                <button type="button" onClick={() => setCollecting(true)} className={primaryBtn}>
                  <Check className="h-3.5 w-3.5" />
                  Mark bills collected
                </button>
              )}
              {canExport && (
                <button type="button" onClick={() => setExporting(true)} className={secondaryBtn}>
                  <Download className="h-3.5 w-3.5" />
                  Export selected
                </button>
              )}
              <button type="button" onClick={() => setSelected(new Set())} className="text-xs font-semibold text-fg-muted underline-offset-2 hover:text-fg hover:underline">
                Clear
              </button>
            </div>
          </div>
        )}
        {list.error && <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{list.error}</p>}
        {list.isInitialLoading ? (
          <div className="flex-1 overflow-hidden">
            <TableSkeleton rows={8} columns={6} />
          </div>
        ) : list.rows.length === 0 ? (
          <div className={cx('flex flex-1 flex-col items-center justify-center p-4 transition-opacity duration-200 sm:p-6', list.isFetching ? 'opacity-70' : 'opacity-100')}>
            {list.hasActiveFilters ? (
              <EmptyState illustration={ILLUSTRATIONS.review} title="No matching expenses" description="Nothing matches the current search or filters." action={{ label: 'Clear filters', onClick: list.clearFilters, variant: 'link' }} />
            ) : (
              <EmptyState
                illustration={f.tab === 'pending' ? ILLUSTRATIONS.approvals : ILLUSTRATIONS.credit}
                title={EMPTY[f.tab].title}
                description={EMPTY[f.tab].description}
                action={canSubmit && (f.tab === 'all' || f.tab === 'pending') ? { label: 'New expense for employee', onClick: () => setCreating(true) } : undefined}
              />
            )}
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <ClaimTable rows={list.rows} sort={f.sort} onSort={list.toggleSort} href={href} showChannel={hybrid} selection={selection} />
            </div>
            <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <ClaimCardList rows={list.rows} href={href} showEmployee showChannel={hybrid} />
            </div>
            <div className="border-t border-line bg-surface px-4 py-2.5">
              <Pagination currentPage={list.page} totalPages={list.totalPages} totalItems={list.total} pageSize={list.pageSize} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} pageSizeOptions={[25, 50, 100]} />
            </div>
          </>
        )}
      </div>

      {canSubmit && <ExpenseFormDrawer mode="hr" open={creating} onClose={() => setCreating(false)} onSaved={onSaved} categories={categories} channels={channels} receiptScan={receiptScan} />}
      {canExport && <ExportClaimsDialog open={exporting} onClose={() => setExporting(false)} scope="hr" initial={exportInitial} subOrgId={f.subOrgId} categories={categories} selectedIds={selectedIds} />}
      {canCollect && (
        <BulkCollectDialog
          open={collecting}
          ids={selectedIds}
          label={(id) => numbers.current.get(id) ?? `#${id}`}
          onClose={() => setCollecting(false)}
          onDone={() => {
            setSelected(new Set());
            list.refetch();
          }}
        />
      )}
    </div>
  );
}
