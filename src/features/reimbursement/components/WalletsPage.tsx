'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, Download, Plus, Search, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { usePermission } from '@/lib/hooks/usePermission';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { useFilterOptions } from '@/features/payroll-runs/hooks/useFilterOptions';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import * as api from '../api/reimbursement.api';
import { ILLUSTRATIONS, REIMB_PERMISSIONS, WALLETS_ACCESS, WALLET_EXPORT_ACCESS } from '../constants/reimbursement.constants';
import { useMutation } from '../hooks/useClaimActions';
import { useExpenseFeatures } from '../hooks/useExpenseFeatures';
import { useExpensesBasePath } from '../hooks/useExpensesBasePath';
import { useFundRequests, type FundTab } from '../hooks/useFundRequests';
import { useWalletList, type WalletFilters } from '../hooks/useWalletList';
import type { FundRequest, Wallet, WalletTotals } from '../types/reimbursement.model';
import { money } from '../utils/format';
import { PayDialog } from './components/ClaimDialogs';
import { ExportStatementDialog } from './components/ExportDialogs';
import { FundRequestList } from './components/FundRequestList';
import { Balance, WalletStatusPill } from './components/StatusBadges';
import { OpenWalletsDrawer } from './components/WalletDialogs';
import { Block, FeatureOff, NoAccess, primaryBtn, secondaryBtn } from './components/Primitives';

type View = 'wallets' | 'requests';

export function WalletsPage() {
  const f = useExpenseFeatures();
  const { canAny } = usePermission();
  if (!f.wallet) return <FeatureOff what="Expense wallets" />;
  if (!canAny(WALLETS_ACCESS)) return <NoAccess what="expense wallets" />;
  return <Wallets />;
}

function Totals({ totals }: { totals: WalletTotals | null }) {
  if (!totals) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Block key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
    );
  }
  const items: Array<[string, React.ReactNode, string]> = [
    ['Wallets', String(totals.wallets), `${totals.active} active · ${totals.frozen} frozen`],
    ['Funds with employees', money(totals.fundsOut), 'Positive balances'],
    ['Owed to employees', money(totals.owedToEmployees), 'Spent below zero'],
    ['Below zero', String(totals.negative), totals.negative === 1 ? 'wallet' : 'wallets'],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(([label, value, note]) => (
        <div key={label} className="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)]">
          <p className="truncate text-xs font-semibold text-fg-muted">{label}</p>
          <p className="mt-1.5 truncate text-xl font-extrabold tabular-nums text-fg">{value}</p>
          <p className="mt-0.5 truncate text-[11px] text-fg-muted">{note}</p>
        </div>
      ))}
    </div>
  );
}

function WalletRows({ rows, href }: { rows: Wallet[]; href: (id: number) => string }) {
  const th = 'border-b border-line bg-bg-subtle px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted 2xl:px-6';
  const td = 'border-b border-line/60 px-4 py-2.5 text-xs sm:text-sm 2xl:px-6';
  return (
    <>
      <div className="hidden h-full overflow-auto tt-scroll-hidden md:block">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={th}>Employee</th>
              <th className={cx(th, 'text-right')}>Balance</th>
              <th className={cx(th, 'hidden text-right lg:table-cell')}>On hold</th>
              <th className={cx(th, 'text-right')}>Available</th>
              <th className={th}>Status</th>
              <th className={cx(th, 'text-right')}>
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className={cx('group hover:bg-bg-subtle/50', w.status === 'closed' && 'opacity-60')}>
                <td className={td}>
                  <Link href={href(w.id)} className="block min-w-0">
                    <div className="truncate font-semibold text-fg">{w.employee.name}</div>
                    <div className="truncate text-[11px] text-fg-muted">{[w.employee.code, w.employee.department].filter(Boolean).join(' · ') || '—'}</div>
                  </Link>
                </td>
                <td className={cx(td, 'text-right font-semibold')}>
                  <Balance value={w.balance} />
                </td>
                <td className={cx(td, 'hidden text-right tabular-nums text-fg-muted lg:table-cell')}>{money(w.held)}</td>
                <td className={cx(td, 'text-right')}>
                  <Balance value={w.available} />
                </td>
                <td className={td}>
                  <WalletStatusPill status={w.status} />
                </td>
                <td className={cx(td, 'text-right')}>
                  <Link href={href(w.id)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg hover:bg-bg-subtle">
                    Open
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-line overflow-y-auto tt-scroll-hidden md:hidden">
        {rows.map((w) => (
          <Link key={w.id} href={href(w.id)} className={cx('flex items-center gap-3 p-4 hover:bg-bg-subtle/60', w.status === 'closed' && 'opacity-60')}>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-semibold text-fg">{w.employee.name}</span>
                <Balance value={w.balance} className="shrink-0 text-sm font-bold" />
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <WalletStatusPill status={w.status} />
                <span className="text-[11px] text-fg-muted">{money(w.available)} available</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
          </Link>
        ))}
      </div>
    </>
  );
}

const FUND_TABS: ReadonlyArray<{ value: FundTab; label: string }> = [
  { value: 'to_pay', label: 'To pay' },
  { value: 'pending', label: 'Waiting for approval' },
  { value: 'paid', label: 'Paid' },
  { value: 'closed', label: 'Closed' },
];

/** HR queue of fund requests (all wallets, or one when `walletId` is set) with Pay. */
export function FundRequestsPanel({ walletId, subOrgId, canPay, onPaid }: { walletId: number | null; subOrgId?: number | null; canPay: boolean; onPaid?: () => void }) {
  const fr = useFundRequests(walletId, subOrgId ?? null);
  const [paying, setPaying] = React.useState<FundRequest | null>(null);
  const { refetch } = fr;
  const done = React.useCallback(() => {
    setPaying(null);
    refetch();
    onPaid?.();
  }, [refetch, onPaid]);
  const m = useMutation(done);
  return (
    <section className="flex min-h-[240px] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
      <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-bold text-fg">Fund requests</h2>
        <div className="overflow-x-auto tt-scroll-hidden">
          <SegmentedControl options={FUND_TABS} value={fr.tab} onChange={fr.setTab} fitText />
        </div>
      </div>
      {fr.error && <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{fr.error}</p>}
      {fr.isLoading ? (
        <TableSkeleton rows={3} columns={3} />
      ) : fr.rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState compact illustration={ILLUSTRATIONS.approvals} title="No fund requests here" description={fr.tab === 'to_pay' ? 'Approved requests waiting to be paid show here.' : 'Requests employees send from their wallet show here.'} />
        </div>
      ) : (
        <div className={cx('transition-opacity duration-200', fr.isFetching ? 'opacity-70' : 'opacity-100')}>
          <FundRequestList
            rows={fr.rows}
            scope="hr"
            showEmployee={!walletId}
            action={(r) =>
              canPay && r.status === 'approved' ? (
                <Btn
                  variant="primary"
                  onClick={() => {
                    m.clearError();
                    setPaying(r);
                  }}
                >
                  Pay
                </Btn>
              ) : null
            }
          />
          {fr.total > 25 && (
            <div className="border-t border-line px-4 py-2.5">
              <Pagination currentPage={fr.page} totalPages={fr.totalPages} totalItems={fr.total} pageSize={25} onPageChange={fr.setPage} />
            </div>
          )}
        </div>
      )}
      {paying && (
        <PayDialog
          open
          title="Pay fund request"
          summary={
            <>
              Record that <span className="font-semibold text-fg">{money(paying.approvedAmount ?? paying.amount)}</span> was sent to <span className="font-semibold text-fg">{paying.employee.name}</span>. It is added to their wallet.
            </>
          }
          busy={m.busy}
          error={m.error}
          onClose={() => setPaying(null)}
          onSubmit={(body) => m.run(() => api.payFundRequest(paying.id, body), 'Fund request paid')}
        />
      )}
    </section>
  );
}

function Wallets() {
  const params = useSearchParams();
  const base = useExpensesBasePath();
  const { can, canAny } = usePermission();
  const list = useWalletList();
  const { departments } = useFilterOptions(list.filters.subOrgId);
  const [view, setView] = React.useState<View>(params.get('tab') === 'requests' ? 'requests' : 'wallets');
  const [opening, setOpening] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const href = React.useCallback((id: number) => `${base}/wallets/${id}`, [base]);
  const f = list.filters;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Expense wallets</h1>
            <p className="text-xs text-fg-muted sm:text-sm">Money the company gives employees for expenses, and what they have spent.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SubOrgFilter value={f.subOrgId} onChange={(subOrgId) => list.update({ subOrgId })} />
            {canAny(WALLET_EXPORT_ACCESS) && (
              <button type="button" onClick={() => setExporting(true)} className={secondaryBtn}>
                <Download className="h-3.5 w-3.5" />
                Statement
              </button>
            )}
            {can(REIMB_PERMISSIONS.WALLET_CREATE) && (
              <button type="button" onClick={() => setOpening(true)} className={primaryBtn}>
                <Plus className="h-3.5 w-3.5" />
                Open wallets
              </button>
            )}
          </div>
        </div>
        <SegmentedControl<View>
          options={[
            { value: 'wallets', label: 'Wallets' },
            { value: 'requests', label: 'Fund requests' },
          ]}
          value={view}
          onChange={setView}
          className="w-full sm:w-auto"
        />
      </div>

      {view === 'requests' ? (
        <FundRequestsPanel walletId={null} subOrgId={f.subOrgId} canPay={can(REIMB_PERMISSIONS.WALLET_TOPUP)} onPaid={list.refetch} />
      ) : (
        <>
          <Totals totals={list.totals} />
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 md:flex-row md:flex-wrap md:items-center">
            <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] md:w-60">
              <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
              <input value={list.searchInput} onChange={(e) => list.setSearchInput(e.target.value)} placeholder="Search name or code…" aria-label="Search wallets" className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm" />
              {list.searchInput && (
                <button type="button" aria-label="Clear search" onClick={() => list.setSearchInput('')} className="text-fg-subtle hover:text-fg">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 md:flex">
              <select aria-label="Status" value={f.status ?? ''} onChange={(e) => list.update({ status: (e.target.value || null) as WalletFilters['status'] })} className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm md:w-36">
                <option value="">Any status</option>
                <option value="active">Active</option>
                <option value="frozen">Frozen</option>
                <option value="closed">Closed</option>
              </select>
              <select aria-label="Balance" value={f.balance ?? ''} onChange={(e) => list.update({ balance: (e.target.value || null) as WalletFilters['balance'] })} className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm md:w-40">
                <option value="">Any balance</option>
                <option value="negative">Below zero</option>
                <option value="low">Running low</option>
              </select>
              <select aria-label="Sort" value={f.sort} onChange={(e) => list.update({ sort: e.target.value as WalletFilters['sort'] })} className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm md:w-40">
                <option value="name">Name</option>
                <option value="balance">Lowest balance</option>
                <option value="-balance">Highest balance</option>
              </select>
              <SearchableFilterDropdown label="Department" allLabel="All departments" value={f.departmentId} options={departments} onChange={(departmentId) => list.update({ departmentId })} className="md:w-44" />
            </div>
          </div>
          <div className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
            {list.error && <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{list.error}</p>}
            {list.isInitialLoading ? (
              <TableSkeleton rows={6} columns={5} />
            ) : list.rows.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-6">
                {list.hasActiveFilters ? (
                  <EmptyState illustration={ILLUSTRATIONS.debits} title="No matching wallets" description="Nothing matches the current search or filters." action={{ label: 'Clear filters', onClick: list.clearFilters, variant: 'link' }} />
                ) : (
                  <EmptyState
                    illustration={ILLUSTRATIONS.debits}
                    title="No wallets yet"
                    description="Open wallets for employees who spend company money, then top them up."
                    action={can(REIMB_PERMISSIONS.WALLET_CREATE) ? { label: 'Open wallets', onClick: () => setOpening(true) } : undefined}
                  />
                )}
              </div>
            ) : (
              <>
                <div className={cx('min-h-0 flex-1 transition-opacity duration-200', list.isFetching ? 'opacity-75' : 'opacity-100')}>
                  <WalletRows rows={list.rows} href={href} />
                </div>
                <div className="border-t border-line px-4 py-2.5">
                  <Pagination currentPage={list.page} totalPages={list.totalPages} totalItems={list.total} pageSize={list.pageSize} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} pageSizeOptions={[25, 50, 100]} />
                </div>
              </>
            )}
          </div>
        </>
      )}

      <OpenWalletsDrawer open={opening} onClose={() => setOpening(false)} onDone={list.refetch} />
      <ExportStatementDialog open={exporting} onClose={() => setExporting(false)} scope="hr" walletCount={list.totals?.wallets} subOrgId={f.subOrgId} />
    </div>
  );
}
