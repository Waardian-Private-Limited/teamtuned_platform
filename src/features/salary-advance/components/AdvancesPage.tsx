'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { cx } from '@/theme/tokens';
import { usePermission } from '@/lib/hooks/usePermission';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useFilterOptions } from '@/features/payroll-runs/hooks/useFilterOptions';
import { ADVANCES_ACCESS, SALARY_ADVANCE_PERMISSIONS } from '../constants/salaryAdvance.constants';
import { useAdvanceList } from '../hooks/useAdvanceList';
import { useAdvanceTypeOptions } from '../hooks/useAdvanceTypeOptions';
import { useSalaryAdvanceBasePath } from '../hooks/useSalaryAdvanceBasePath';
import { AdvancesToolbar } from './components/AdvancesToolbar';
import { AdvanceTable } from './components/AdvanceTable';
import { AdvanceCardList } from './components/AdvanceCardList';
import { AdvancesEmptyState } from './components/AdvancesEmptyState';
import { NewAdvanceDrawer } from './components/NewAdvanceDrawer';
import { ExportDialog } from './components/ExportDialog';
import { NoAccess } from './components/NoAccess';

export function AdvancesPage() {
  const { canAny } = usePermission();
  if (!canAny(ADVANCES_ACCESS)) return <NoAccess what="salary advances" />;
  return <Advances />;
}

function Advances() {
  const { can, isOrgAdmin, hasPerm } = usePermission();
  const router = useRouter();
  const base = useSalaryAdvanceBasePath();
  const canCreate = can(SALARY_ADVANCE_PERMISSIONS.CREATE);
  const canSkipApproval = isOrgAdmin || hasPerm(SALARY_ADVANCE_PERMISSIONS.APPROVE);

  const list = useAdvanceList();
  const { types } = useAdvanceTypeOptions(true);
  const { sites, departments } = useFilterOptions(list.filters.subOrgId);
  const [creating, setCreating] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const detailHref = React.useCallback((id: number) => `${base}/advances/${id}`, [base]);
  const typeOptions = React.useMemo(() => types.map((t) => ({ value: t.id, label: t.name })), [types]);
  const activeTypes = React.useMemo(() => types.filter((t) => t.status === 'active'), [types]);

  const onCreated = React.useCallback(
    (id: number) => {
      setCreating(false);
      router.push(detailHref(id));
    },
    [router, detailHref]
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <AdvancesToolbar
        total={list.total}
        counts={list.counts}
        filters={list.filters}
        onChange={list.update}
        searchValue={list.searchInput}
        onSearchChange={list.setSearchInput}
        types={typeOptions}
        sites={sites}
        departments={departments}
        canCreate={canCreate}
        onCreate={() => setCreating(true)}
        onExport={() => setExporting(true)}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{list.error}</p>}

        {list.isInitialLoading ? (
          <div className="flex-1 overflow-hidden">
            <TableSkeleton rows={8} columns={7} />
          </div>
        ) : list.rows.length === 0 ? (
          <div className={cx('flex flex-1 flex-col transition-opacity duration-200', list.isFetching ? 'opacity-70' : 'opacity-100')}>
            <AdvancesEmptyState tab={list.filters.tab} filtered={list.hasActiveFilters} canCreate={canCreate} onCreate={() => setCreating(true)} onClear={list.clearFilters} />
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <AdvanceTable rows={list.rows} sort={list.filters.sort} onSort={list.toggleSort} detailHref={detailHref} />
            </div>
            <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <AdvanceCardList rows={list.rows} detailHref={detailHref} />
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

      {canCreate && <NewAdvanceDrawer open={creating} types={activeTypes} canSkipApproval={canSkipApproval} onClose={() => setCreating(false)} onCreated={onCreated} />}
      <ExportDialog open={exporting} onClose={() => setExporting(false)} types={types} initialStatus={list.filters.tab} initialType={list.filters.typeId} />
    </div>
  );
}
