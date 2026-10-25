'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { FUND_ACTIONS, FUND_REQUESTS_ACCESS, FUND_TABS, ILLUSTRATIONS } from '../constants/petty-cash.constants';
import { useFundRequests } from '../hooks/useFundRequests';
import { usePettyCashAccess } from '../hooks/usePettyCashAccess';
import type { FundRequest } from '../types/petty-cash.model';
import { FundPayDialog } from './components/FundDialogs';
import { FundRequestList } from './components/FundRequestList';
import { Gate, PageHeader } from './components/Primitives';

/** HR queue of fund requests with Pay for Accounts. */
export function FundRequestsPage() {
  const { enabled, canAny } = usePettyCashAccess();
  return (
    <Gate enabled={enabled} allowed={canAny(FUND_REQUESTS_ACCESS)} what="petty cash fund requests">
      <FundRequests />
    </Gate>
  );
}

function FundRequests() {
  const { canAny } = usePettyCashAccess();
  const fr = useFundRequests(null);
  const [paying, setPaying] = React.useState<FundRequest | null>(null);
  const canPay = canAny(FUND_ACTIONS);
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader title="Fund requests" description="Custodians ask for cash here. Approved requests wait for Accounts to pay them into the wallet." />
      <section className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        <div className="flex flex-col gap-2 border-b border-line p-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full overflow-x-auto tt-scroll-hidden md:w-auto">
            <SegmentedControl options={FUND_TABS} value={fr.tab} onChange={fr.setTab} fitText />
          </div>
          <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] md:w-64">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
            <input value={fr.searchInput} onChange={(e) => fr.setSearchInput(e.target.value)} placeholder="Search wallet or person…" aria-label="Search fund requests" className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm" />
            {fr.searchInput && (
              <button type="button" aria-label="Clear search" onClick={() => fr.setSearchInput('')} className="text-fg-subtle hover:text-fg">
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
        </div>
        {fr.error && <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{fr.error}</p>}
        {fr.isLoading ? (
          <TableSkeleton rows={4} columns={4} />
        ) : fr.rows.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              illustration={ILLUSTRATIONS.funds}
              title={fr.search ? 'No matching fund requests' : 'No fund requests here'}
              description={fr.search ? 'Nothing matches the search.' : fr.tab === 'to_pay' ? 'Approved requests waiting to be paid show here.' : 'Requests custodians send from their wallet show here.'}
            />
          </div>
        ) : (
          <div className={cx('min-h-0 flex-1 overflow-auto transition-opacity duration-200', fr.isFetching ? 'opacity-70' : 'opacity-100')}>
            <FundRequestList rows={fr.rows} action={(r) => (canPay && r.status === 'approved' ? <Btn variant="primary" onClick={() => setPaying(r)}>Pay</Btn> : null)} />
            {fr.total > fr.pageSize && (
              <div className="border-t border-line px-4 py-2.5">
                <Pagination currentPage={fr.page} totalPages={fr.totalPages} totalItems={fr.total} pageSize={fr.pageSize} onPageChange={fr.setPage} />
              </div>
            )}
          </div>
        )}
      </section>
      <FundPayDialog request={paying} onClose={() => setPaying(null)} onDone={() => { setPaying(null); fr.refetch(); }} />
    </div>
  );
}
