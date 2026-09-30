'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EMPLOYEE_PERMISSIONS, type TimelineTab } from '../constants/employees.constants';
import { useEmployeeList } from '../hooks/useEmployeeList';
import { useEmployeeStatus, type StatusAction } from '../hooks/useEmployeeStatus';
import { useEmployeeRoutes } from '../hooks/useEmployeeRoutes';
import type { EmployeeListItemDto } from '../types/employees.dto';
import { EmployeesToolbar } from './list/EmployeesToolbar';
import { EmployeeTable } from './list/EmployeeTable';
import { EmployeeCardList } from './list/EmployeeCardList';
import { EmployeesEmptyState } from './list/EmployeesEmptyState';
import { EmployeeActionDialog } from './list/EmployeeActionDialog';
import { EmployeeTimelineDrawer } from './list/EmployeeTimelineDrawer';
import { EmployeeSettingsDrawer } from './settings/EmployeeSettingsDrawer';

export function EmployeesPage() {
  const router = useRouter();
  const routes = useEmployeeRoutes();
  const { can, hasPerm } = usePermission();
  const perms = {
    canAdd: can(EMPLOYEE_PERMISSIONS.ADD),
    canEdit: can(EMPLOYEE_PERMISSIONS.EDIT),
    canDelete: can(EMPLOYEE_PERMISSIONS.DELETE),
    canSalary: can('COMP_VIEW') || hasPerm('COMP_ADD') || hasPerm('COMP_APPROVE') || hasPerm('HR_MODE'),
  };
  const timelineTabs = React.useMemo<TimelineTab[]>(
    () => ['job', ...(perms.canSalary ? ['salary' as const] : []), ...(perms.canEdit ? ['audit' as const] : [])],
    [perms.canSalary, perms.canEdit]
  );
  const list = useEmployeeList();
  const status = useEmployeeStatus(list.refetch, list.patchLocally);
  const [target, setTarget] = React.useState<{ employee: EmployeeListItemDto; action: StatusAction } | null>(null);
  const [historyOf, setHistoryOf] = React.useState<{ id: number; name: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const onHistory = (e: EmployeeListItemDto) => setHistoryOf({ id: e.id, name: e.name });

  const openCreate = () => router.push(routes.create);
  const openEdit = (e: EmployeeListItemDto) => router.push(routes.edit(e.id));
  const onAction = (employee: EmployeeListItemDto, action: StatusAction) => setTarget({ employee, action });

  const confirm = async (exit?: { exitDate: string; reason: string }) => {
    if (!target) return;
    const ok = await status.run(target.employee, target.action, exit);
    if (ok) setTarget(null);
  };

  const fade = list.isFetching ? 'opacity-75' : 'opacity-100';

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <EmployeesToolbar
        counts={list.counts}
        searchValue={list.searchInput}
        onSearchChange={list.setSearchInput}
        status={list.status}
        onStatusChange={list.setStatus}
        subOrgId={list.subOrgId}
        onSubOrgChange={list.setSubOrgId}
        canAdd={perms.canAdd}
        onAdd={openCreate}
        onSettings={perms.canEdit ? () => setSettingsOpen(true) : undefined}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && (
          <div className="border-b border-line p-3">
            <Alert message={list.error} tone="error" />
          </div>
        )}

        {list.isInitialLoading ? (
          <div className="flex-1 overflow-hidden">
            <TableSkeleton rows={8} columns={6} />
          </div>
        ) : list.employees.length === 0 ? (
          <div className={cx('flex flex-1 flex-col transition-opacity duration-200', fade)}>
            <EmployeesEmptyState filtered={list.hasActiveFilters} canAdd={perms.canAdd} onAdd={openCreate} onClear={list.clearFilters} />
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block', fade)}>
              <EmployeeTable
                employees={list.employees}
                canEdit={perms.canEdit}
                canDelete={perms.canDelete}
                busyId={status.busyId}
                onEdit={openEdit}
                onAction={onAction}
                onHistory={onHistory}
              />
            </div>
            <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden', fade)}>
              <EmployeeCardList
                employees={list.employees}
                canEdit={perms.canEdit}
                canDelete={perms.canDelete}
                busyId={status.busyId}
                onEdit={openEdit}
                onAction={onAction}
                onHistory={onHistory}
              />
            </div>
            {list.total > 0 && (
              <div className="border-t border-line bg-surface px-4 py-2.5">
                <Pagination
                  currentPage={list.page}
                  totalPages={list.totalPages}
                  totalItems={list.total}
                  pageSize={list.pageSize}
                  onPageChange={list.setPage}
                  onPageSizeChange={list.setPageSize}
                />
              </div>
            )}
          </>
        )}
      </div>

      <EmployeeSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <EmployeeTimelineDrawer employee={historyOf} tabs={timelineTabs} onClose={() => setHistoryOf(null)} />
      <EmployeeActionDialog target={target} busy={status.busyId !== null} onClose={() => setTarget(null)} onConfirm={confirm} />
    </div>
  );
}
