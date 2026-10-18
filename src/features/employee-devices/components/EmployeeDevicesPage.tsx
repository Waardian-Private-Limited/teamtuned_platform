'use client';

import React from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { useEmployeeDeviceList } from '../hooks/useEmployeeDeviceList';
import { useEmployeeDeviceDetail } from '../hooks/useEmployeeDeviceDetail';
import { useEmployeeDeviceActions } from '../hooks/useEmployeeDeviceActions';
import { EMP_DEVICE_PERMISSION, PAGE_SIZE_OPTIONS } from '../constants/employeeDevices.constants';
import type { EmployeeDevice } from '../types/employeeDevices.model';
import { EmployeeDevicesToolbar } from './components/EmployeeDevicesToolbar';
import { EmployeeDeviceTable } from './components/EmployeeDeviceTable';
import { EmployeeDeviceCardList } from './components/EmployeeDeviceCardList';
import { EmployeeDeviceTableSkeleton } from './components/EmployeeDeviceTableSkeleton';
import { EmployeeDevicesEmptyState } from './components/EmployeeDevicesEmptyState';
import { EmployeeDeviceDrawer } from './components/EmployeeDeviceDrawer';
import { ResetDeviceDialog } from './components/ResetDeviceDialog';

/**
 * Employee Devices: the phone each employee's app is registered to, a new
 * phone waiting for HR (when their policy's phone lock is on), and what
 * happened. HR can allow the waiting phone, reset the registered one or log a
 * session out. The phone lock applies to the mobile app only: web sign-ins
 * are never limited and are shown apart, only so a browser can be signed out.
 */
export function EmployeeDevicesPage() {
  const { can } = usePermission();
  const canManage = can(EMP_DEVICE_PERMISSION);

  if (!canManage) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-line bg-surface p-8 text-center">
        <h1 className="text-base font-bold text-fg">Employee Devices</h1>
        <p className="mt-1 text-sm text-fg-muted">You do not have access to employee devices.</p>
      </div>
    );
  }
  return <EmployeeDevicesContent />;
}

function EmployeeDevicesContent() {
  const list = useEmployeeDeviceList();
  const [openUserId, setOpenUserId] = React.useState<number | null>(null);
  const [resetOpen, setResetOpen] = React.useState(false);
  const detail = useEmployeeDeviceDetail(openUserId);

  const { refetch } = list;
  const reloadDetail = detail.reload;
  const afterAction = React.useCallback(() => {
    refetch();
    reloadDetail();
  }, [refetch, reloadDetail]);
  const actions = useEmployeeDeviceActions(afterAction);

  const open = (employee: EmployeeDevice) => setOpenUserId(employee.userId);
  const close = () => {
    setOpenUserId(null);
    setResetOpen(false);
  };

  const busy = actions.busy;
  const allowing = busy?.kind === 'allow';
  const resetting = busy?.kind === 'reset';
  const loggingOutId = busy?.kind === 'logout' ? busy.sessionId : null;

  const confirmReset = async () => {
    if (openUserId === null) return;
    const ok = await actions.reset(openUserId);
    if (ok) setResetOpen(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <EmployeeDevicesToolbar
        total={list.total}
        summary={list.summary}
        searchValue={list.searchInput}
        onSearchChange={list.setSearchInput}
        status={list.status}
        onStatusChange={list.setStatus}
        platform={list.platform}
        onPlatformChange={list.setPlatform}
        subOrgId={list.subOrgId}
        onSubOrgChange={list.setSubOrgId}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && (
          <div className="border-b border-line p-3">
            <Alert message={list.error} tone="error" />
          </div>
        )}

        {list.isInitialLoading ? (
          <div className="flex-1 overflow-hidden">
            <EmployeeDeviceTableSkeleton rows={6} />
          </div>
        ) : list.employees.length === 0 ? (
          <div className={cx('flex flex-1 flex-col transition-opacity duration-200', list.isFetching ? 'opacity-70' : 'opacity-100')}>
            <EmployeeDevicesEmptyState
              status={list.status}
              searchTerm={list.searchInput}
              isFiltered={list.hasActiveFilters}
              onClear={list.clearFilters}
            />
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <EmployeeDeviceTable employees={list.employees} onOpen={open} />
            </div>

            <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <EmployeeDeviceCardList employees={list.employees} onOpen={open} />
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
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                />
              </div>
            )}
          </>
        )}
      </div>

      <EmployeeDeviceDrawer
        open={openUserId !== null}
        detail={detail.detail}
        isLoading={detail.isLoading}
        error={detail.error}
        canManage
        allowing={allowing}
        loggingOutId={loggingOutId}
        onAllow={() => openUserId !== null && actions.allow(openUserId)}
        onReset={() => setResetOpen(true)}
        onLogout={actions.logout}
        onClose={close}
      />

      <ResetDeviceDialog
        open={resetOpen}
        employeeName={detail.detail?.name || 'This employee'}
        deviceName={detail.detail?.device?.name || null}
        isSaving={resetting}
        onClose={() => setResetOpen(false)}
        onConfirm={confirmReset}
      />
    </div>
  );
}
