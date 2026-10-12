'use client';

import React from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { monthLabel } from '@/features/salary-slips/utils/format';
import { OTHER_DEDUCTION_PERMISSIONS } from '../constants/otherDeductions.constants';
import { useOtherDeductions } from '../hooks/useOtherDeductions';
import { useDeductionMutations } from '../hooks/useDeductionMutations';
import type { DeductionFormInput, OtherDeduction } from '../types/otherDeductions.model';
import { DeductionsToolbar } from './components/DeductionsToolbar';
import { DeductionTotalsBar } from './components/DeductionTotalsBar';
import { DeductionTable } from './components/DeductionTable';
import { DeductionCardList } from './components/DeductionCardList';
import { DeductionsEmptyState } from './components/DeductionsEmptyState';
import { AddDeductionDrawer } from './components/AddDeductionDrawer';
import { CancelDeductionDialog } from './components/CancelDeductionDialog';

export function OtherDeductionsPage() {
  const { can } = usePermission();
  const canAdd = can(OTHER_DEDUCTION_PERMISSIONS.ADD);
  const canCancel = can(OTHER_DEDUCTION_PERMISSIONS.DELETE);

  const list = useOtherDeductions();
  const mutations = useDeductionMutations(list.refetch, list.markCancelledLocally);

  const [adding, setAdding] = React.useState(false);
  const [cancelTarget, setCancelTarget] = React.useState<OtherDeduction | null>(null);

  const openAdd = () => {
    mutations.clearFormErrors();
    setAdding(true);
  };
  const closeAdd = () => {
    setAdding(false);
    mutations.clearFormErrors();
  };
  const submitAdd = async (input: DeductionFormInput) => {
    if (await mutations.create(input)) setAdding(false);
  };

  const closeCancel = () => {
    setCancelTarget(null);
    mutations.clearCancelError();
  };
  const confirmCancel = async () => {
    if (!cancelTarget) return;
    if (await mutations.cancel([cancelTarget.id])) setCancelTarget(null);
  };

  const monthText = monthLabel(list.month);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <DeductionsToolbar
        total={list.total}
        month={list.month}
        onMonthChange={list.setMonth}
        searchValue={list.searchInput}
        onSearchChange={list.setSearchInput}
        status={list.status}
        onStatusChange={list.setStatus}
        canAdd={canAdd}
        onAdd={openAdd}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.hasAny && (
          <DeductionTotalsBar monthText={monthText} count={list.totals.count} amount={list.totals.amount} paid={list.totals.paid} />
        )}

        {list.error && (
          <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">
            {list.error}
          </p>
        )}

        {list.isInitialLoading ? (
          <div className="flex-1 overflow-hidden">
            <TableSkeleton rows={8} columns={6} />
          </div>
        ) : list.rows.length === 0 ? (
          <div className={cx('flex flex-1 flex-col transition-opacity duration-200', list.isFetching ? 'opacity-70' : 'opacity-100')}>
            <DeductionsEmptyState
              filtered={list.hasActiveFilters}
              monthText={monthText}
              canAdd={canAdd}
              onAdd={openAdd}
              onClear={list.clearFilters}
            />
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <DeductionTable rows={list.rows} canCancel={canCancel} onCancel={setCancelTarget} />
            </div>
            <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <DeductionCardList rows={list.rows} canCancel={canCancel} onCancel={setCancelTarget} />
            </div>
            <div className="border-t border-line bg-surface px-4 py-2.5">
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

      <AddDeductionDrawer
        open={adding}
        isSaving={mutations.isSaving}
        fieldErrors={mutations.fieldErrors}
        formError={mutations.formError}
        onFieldErrors={mutations.setFieldErrors}
        onClose={closeAdd}
        onSubmit={submitAdd}
      />

      <CancelDeductionDialog
        deduction={cancelTarget}
        busy={mutations.isCancelling}
        error={mutations.cancelError}
        onClose={closeCancel}
        onConfirm={confirmCancel}
      />
    </div>
  );
}
