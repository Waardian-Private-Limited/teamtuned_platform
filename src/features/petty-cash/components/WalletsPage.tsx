'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Download, Plus, Search, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useFilterOptions } from '@/features/payroll-runs/hooks/useFilterOptions';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { FUND_ACTIONS, ILLUSTRATIONS, PC, STATEMENT_ACCESS, WALLETS_ACCESS } from '../constants/petty-cash.constants';
import { usePettyCashAccess } from '../hooks/usePettyCashAccess';
import { usePettyCashBasePath } from '../hooks/usePettyCashBasePath';
import { useWalletList, type WalletFilters } from '../hooks/useWalletList';
import type { Wallet, WalletTotals } from '../types/petty-cash.model';
import { money, walletOwner } from '../utils/format';
import { ExportStatementDialog } from './components/ExportStatementDialog';
import { Block, Gate, PageHeader, primaryBtn, secondaryBtn } from './components/Primitives';
import { Balance, LowBadge, WalletStatusPill } from './components/StatusBadges';
import { FloatBar, WalletCard } from './components/WalletCard';
import { WalletFormDrawer } from './components/WalletFormDialog';
import { TopUpDialog } from './components/WalletActionDialogs';

export function WalletsPage() {
  const { enabled, canAny } = usePettyCashAccess();
  return (
    <Gate enabled={enabled} allowed={canAny(WALLETS_ACCESS)} what="petty cash wallets">
      <Wallets />
    </Gate>
  );
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
  const items: Array<[string, string, string]> = [
    ['Wallets', String(totals.wallets), `${totals.active} active · ${totals.frozen} frozen`],
    ['Cash in wallets', money(totals.cashInHand), 'Book balance'],
    ['On hold', money(totals.held), 'Pending expenses'],
    ['Running low', String(totals.low), totals.low === 1 ? 'wallet' : 'wallets'],
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

function WalletRows({ rows, href, onTopUp }: { rows: Wallet[]; href: (id: number) => string; onTopUp?: (w: Wallet) => void }) {
  const th = 'border-b border-line bg-bg-subtle px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted 2xl:px-6';
  const td = 'border-b border-line/60 px-4 py-3 text-xs sm:text-sm 2xl:px-6';
  return (
    <>
      <div className="hidden h-full overflow-auto tt-scroll-hidden md:block">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={th}>Wallet</th>
              <th className={cx(th, 'hidden xl:table-cell')}>Custodians</th>
              <th className={cx(th, 'text-right')}>Balance</th>
              <th className={cx(th, 'hidden text-right lg:table-cell')}>On hold</th>
              <th className={cx(th, 'hidden w-40 lg:table-cell')}>Float</th>
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
                    <div className="truncate font-semibold text-fg">{w.name}</div>
                    <div className="truncate text-[11px] text-fg-muted">{[walletOwner(w), w.code].filter(Boolean).join(' · ')}</div>
                  </Link>
                </td>
                <td className={cx(td, 'hidden max-w-[14rem] truncate text-fg-muted xl:table-cell')}>{w.custodians.map((c) => c.name).join(', ') || '—'}</td>
                <td className={cx(td, 'text-right font-semibold')}>
                  <Balance value={w.balance} />
                </td>
                <td className={cx(td, 'hidden text-right tabular-nums text-fg-muted lg:table-cell')}>{money(w.held)}</td>
                <td className={cx(td, 'hidden lg:table-cell')}>
                  <FloatBar balance={w.balance} floatAmount={w.floatAmount} hasFloat={w.hasFloat} />
                </td>
                <td className={td}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <WalletStatusPill status={w.status} />
                    {w.low && w.status === 'active' && <LowBadge />}
                  </div>
                </td>
                <td className={cx(td, 'text-right')}>
                  <div className="inline-flex items-center gap-1.5">
                    {onTopUp && w.status !== 'closed' && (
                      <button type="button" onClick={() => onTopUp(w)} aria-label={`Top up ${w.name}`} className={cx(primaryBtn, 'h-8 px-2.5')}>
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        Top up
                      </button>
                    )}
                    <Link href={href(w.id)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg hover:bg-bg-subtle">
                      Open
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 overflow-y-auto p-3 md:hidden">
        {rows.map((w) => (
          <div key={w.id} className="flex min-w-0 flex-col gap-1.5">
            <WalletCard wallet={w} href={href(w.id)} />
            {onTopUp && w.status !== 'closed' && (
              <button type="button" onClick={() => onTopUp(w)} className={cx(primaryBtn, 'w-full justify-center')}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Top up {w.name}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function Wallets() {
  const router = useRouter();
  const base = usePettyCashBasePath();
  const { can, canAny } = usePettyCashAccess();
  const list = useWalletList();
  const f = list.filters;
  const { sites } = useFilterOptions(f.subOrgId);
  const [creating, setCreating] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [topUp, setTopUp] = React.useState<Wallet | null>(null);
  const canTopUp = canAny(FUND_ACTIONS);
  const href = React.useCallback((id: number) => `${base}/wallets/${id}`, [base]);
  const selectCls = 'h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm';

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader title="Petty cash wallets" description="Cash held at sites and company offices, who looks after it, and what is left.">
        <SubOrgFilter value={f.subOrgId} onChange={(subOrgId) => list.update({ subOrgId, siteId: null })} allLabel="All companies" />
        {canAny(STATEMENT_ACCESS) && (
          <button type="button" onClick={() => setExporting(true)} className={secondaryBtn}>
            <Download className="h-3.5 w-3.5" aria-hidden />
            Statement
          </button>
        )}
        {can(PC.ADMIN) && (
          <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New wallet
          </button>
        )}
      </PageHeader>

      <Totals totals={list.totals} />

      <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 md:flex-row md:flex-wrap md:items-center">
        <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] md:w-60">
          <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
          <input value={list.searchInput} onChange={(e) => list.setSearchInput(e.target.value)} placeholder="Search name or code…" aria-label="Search wallets" className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm" />
          {list.searchInput && (
            <button type="button" aria-label="Clear search" onClick={() => list.setSearchInput('')} className="text-fg-subtle hover:text-fg">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <select aria-label="Status" value={f.status ?? ''} onChange={(e) => list.update({ status: (e.target.value || null) as WalletFilters['status'] })} className={cx(selectCls, 'md:w-36')}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="frozen">Frozen</option>
            <option value="closed">Closed</option>
          </select>
          <select aria-label="Balance" value={f.balance ?? ''} onChange={(e) => list.update({ balance: (e.target.value || null) as WalletFilters['balance'] })} className={cx(selectCls, 'md:w-40')}>
            <option value="">Any balance</option>
            <option value="low">Running low</option>
            <option value="negative">Below zero</option>
          </select>
          <select aria-label="Sort" value={f.sort} onChange={(e) => list.update({ sort: e.target.value as WalletFilters['sort'] })} className={cx(selectCls, 'md:w-40')}>
            <option value="name">Name</option>
            <option value="balance">Lowest balance</option>
            <option value="-opened_at">Newest</option>
          </select>
          <SearchableFilterDropdown label="Site" allLabel="All sites" value={f.siteId} options={sites} onChange={(siteId) => list.update({ siteId })} className="md:w-44" />
        </div>
      </div>

      <div className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{list.error}</p>}
        {list.isInitialLoading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : list.rows.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6">
            {list.hasActiveFilters ? (
              <EmptyState illustration={ILLUSTRATIONS.search} title="No matching wallets" description="Nothing matches the current search or filters." action={{ label: 'Clear filters', onClick: list.clearFilters, variant: 'link' }} />
            ) : (
              <EmptyState
                illustration={ILLUSTRATIONS.wallet}
                title="No wallets yet"
                description="Create a wallet for a site or office, name its custodians and set its float."
                action={can(PC.ADMIN) ? { label: 'New wallet', onClick: () => setCreating(true) } : undefined}
              />
            )}
          </div>
        ) : (
          <>
            <div className={cx('min-h-0 flex-1 transition-opacity duration-200', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <WalletRows rows={list.rows} href={href} onTopUp={canTopUp ? setTopUp : undefined} />
            </div>
            <div className="border-t border-line px-4 py-2.5">
              <Pagination currentPage={list.page} totalPages={list.totalPages} totalItems={list.total} pageSize={list.pageSize} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} pageSizeOptions={[25, 50, 100]} />
            </div>
          </>
        )}
      </div>

      <WalletFormDrawer open={creating} onClose={() => setCreating(false)} onSaved={(id) => { setCreating(false); router.push(href(id)); }} />
      <ExportStatementDialog open={exporting} onClose={() => setExporting(false)} />
      {topUp && <TopUpDialog wallet={topUp} open onClose={() => setTopUp(null)} onDone={list.refetch} />}
    </div>
  );
}
