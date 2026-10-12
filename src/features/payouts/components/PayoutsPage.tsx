'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { usePermission } from '@/lib/hooks/usePermission';
import { messageOf } from '@/lib/api/errors';
import { showError } from '@/lib/toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import { useFilterOptions } from '@/features/payroll-runs/hooks/useFilterOptions';
import { NoAccess } from '@/features/salary-advance/components/components/NoAccess';
import { money } from '@/features/salary-advance/utils/format';
import * as api from '../api/payouts.api';
import { PAYOUT_PERMISSIONS, PAYOUTS_ACCESS, PAYOUTS_ILLUSTRATION } from '../constants/payouts.constants';
import { usePayouts } from '../hooks/usePayouts';
import type { Payout, PayoutSource, PayoutTab } from '../types/payouts.model';
import { MarkFailedDialog, MarkPaidDialog } from './components/PayDialogs';
import { PayoutCardList, PayoutTable } from './components/PayoutTable';
import { PayoutTiles } from './components/PayoutTiles';
import { PayoutsToolbar } from './components/PayoutsToolbar';

export function PayoutsPage() {
  const { canAny } = usePermission();
  if (!canAny(PAYOUTS_ACCESS)) return <NoAccess what="payouts" />;
  return <Payouts />;
}

const EMPTY: Record<PayoutTab, { title: string; description: string }> = {
  to_pay: { title: 'Nothing to pay', description: 'Finalized payrolls and approved advances paid by Accounts show up here.' },
  failed: { title: 'No failed payments', description: 'Salaries whose transfer bounced come back here with the reason.' },
  paid: { title: 'Nothing paid yet', description: 'Payments you mark paid are listed here with their date and reference.' },
  all: { title: 'No payouts yet', description: 'Finalized payrolls and approved advances paid by Accounts show up here.' },
};

function Payouts() {
  const { can } = usePermission();
  const canPay = can(PAYOUT_PERMISSIONS.PAY);
  const area = usePathname()?.startsWith('/employee') ? '/employee' : '/org-admin';
  const list = usePayouts();
  const { sites } = useFilterOptions(list.filters.subOrgId);
  const { track } = useDownloadCenter();
  const [dialog, setDialog] = React.useState<'paid' | 'failed' | null>(null);

  const tab = list.filters.tab;
  const selectable = React.useCallback(
    (r: Payout) => canPay && (r.status !== 'paid' || (tab === 'paid' && r.source === 'salary')),
    [canPay, tab]
  );
  const selectedRows = [...list.selected.values()];
  const selectedPaid = selectedRows.filter((r) => r.status === 'paid');
  const selectedOpen = selectedRows.filter((r) => r.status !== 'paid');
  const selectedTotal = selectedRows.reduce((s, r) => s + r.amount, 0);

  const openTab = (t: PayoutTab, source?: PayoutSource) => list.update({ tab: t, source: source ?? null });

  const bankSheet = async () => {
    try {
      const keys = selectedOpen.length ? selectedOpen.map((r) => r.key) : null;
      track(await api.exportBankSheet({ ...list.query, tab: keys ? 'all' : list.query.tab }, keys));
    } catch (err) {
      showError(messageOf(err));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PayoutTiles overview={list.overview} loading={list.isInitialLoading} onOpen={openTab} />
      <PayoutsToolbar
        total={list.total}
        filters={list.filters}
        onChange={list.update}
        searchValue={list.searchInput}
        onSearchChange={list.setSearchInput}
        sites={sites}
        canPay={canPay}
        onBankSheet={bankSheet}
      />

      {selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-fg/20 bg-bg-subtle px-3.5 py-2.5">
          <p className="text-xs text-fg sm:text-sm">
            <span className="font-semibold">{selectedRows.length} selected</span> · <span className="tabular-nums">{money(selectedTotal)}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {selectedOpen.length > 0 && (
              <Btn variant="primary" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => setDialog('paid')}>Mark paid</Btn>
            )}
            {selectedPaid.length > 0 && (
              <Btn icon={<AlertTriangle className="h-3.5 w-3.5" />} onClick={() => setDialog('failed')} className="hover:text-[var(--tt-danger)]">Payment failed</Btn>
            )}
            <Btn icon={<X className="h-3.5 w-3.5" />} onClick={list.clearSelection}>Clear</Btn>
          </div>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{list.error}</p>}
        {list.isInitialLoading ? (
          <div className="flex-1 overflow-hidden"><TableSkeleton rows={8} columns={8} /></div>
        ) : list.rows.length === 0 ? (
          <div className="flex flex-1 flex-col justify-center">
            <EmptyState
              illustration={PAYOUTS_ILLUSTRATION}
              title={list.hasActiveFilters ? 'No payouts match these filters' : EMPTY[tab].title}
              description={list.hasActiveFilters ? 'Try another month, site or search.' : EMPTY[tab].description}
              action={list.hasActiveFilters ? { label: 'Clear filters', onClick: list.clearFilters, variant: 'link' } : undefined}
            />
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <PayoutTable
                rows={list.rows}
                sort={list.filters.sort}
                onSort={list.toggleSort}
                selectable={selectable}
                selected={list.selected}
                onToggle={list.toggle}
                onTogglePage={list.togglePage}
                area={area}
              />
            </div>
            <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto tt-scroll-hidden md:hidden', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <PayoutCardList rows={list.rows} selectable={selectable} selected={list.selected} onToggle={list.toggle} area={area} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface px-4 py-2.5">
              <span className="text-xs text-fg-muted">Total <strong className="tabular-nums text-fg">{money(list.amount)}</strong></span>
              <Pagination
                currentPage={list.page}
                totalPages={list.totalPages}
                totalItems={list.total}
                pageSize={list.pageSize}
                onPageChange={list.setPage}
                onPageSizeChange={list.setPageSize}
                pageSizeOptions={[25, 50, 100]}
              />
            </div>
          </>
        )}
      </div>

      <MarkPaidDialog open={dialog === 'paid'} rows={selectedOpen} onClose={() => setDialog(null)} onDone={list.refresh} />
      <MarkFailedDialog open={dialog === 'failed'} rows={selectedPaid.filter((r) => r.source === 'salary')} onClose={() => setDialog(null)} onDone={list.refresh} />
    </div>
  );
}
