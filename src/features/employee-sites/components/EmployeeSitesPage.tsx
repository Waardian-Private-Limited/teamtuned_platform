'use client';

import React from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import type { FilterOption } from '@/components/ui/SearchableFilterDropdown';
import * as employeeSitesApi from '../api/employeeSites.api';
import { useEmployeeSiteList } from '../hooks/useEmployeeSiteList';
import { useEmployeeSiteEditor } from '../hooks/useEmployeeSiteEditor';
import { EMPLOYEE_SITE_PERMISSIONS } from '../constants/employeeSites.constants';
import { EmployeeSitesToolbar } from './components/EmployeeSitesToolbar';
import { EmployeeSiteTable } from './components/EmployeeSiteTable';
import { EmployeeSiteCardList } from './components/EmployeeSiteCardList';
import { EmployeeSiteTableSkeleton } from './components/EmployeeSiteTableSkeleton';
import { EmployeeSitesEmptyState } from './components/EmployeeSitesEmptyState';
import { EmployeeSiteDrawer } from './components/EmployeeSiteDrawer';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

// Filter dropdown sources. Both load once; the site filter takes the first
// hundred active sites the user can see.
function useFilterOptions() {
  const [departments, setDepartments] = React.useState<FilterOption[]>([]);
  const [sites, setSites] = React.useState<FilterOption[]>([]);

  React.useEffect(() => {
    employeeSitesApi.listDepartmentOptions()
      .then((rows) => setDepartments((Array.isArray(rows) ? rows : []).map((d) => ({ value: d.id, label: d.name }))))
      .catch(() => {});
    employeeSitesApi.searchSiteOptions({ limit: 100 })
      .then((dto) => setSites((dto.sites || []).map((s) => ({ value: s.id, label: s.name || `Site #${s.id}` }))))
      .catch(() => {});
  }, []);

  return { departments, sites };
}

export function EmployeeSitesPage() {
  const { can } = usePermission();
  const canAssign = can(EMPLOYEE_SITE_PERMISSIONS.ASSIGN);

  const list = useEmployeeSiteList();
  const filters = useFilterOptions();

  const [openId, setOpenId] = React.useState<number | null>(null);
  const editor = useEmployeeSiteEditor(openId, list.refetch);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <EmployeeSitesToolbar
        total={list.total}
        summary={list.summary}
        searchValue={list.searchInput}
        onSearchChange={list.setSearchInput}
        segment={list.segment}
        onSegmentChange={list.setSegment}
        departments={filters.departments}
        departmentId={list.departmentId}
        onDepartmentChange={list.setDepartmentId}
        sites={filters.sites}
        siteId={list.siteId}
        onSiteChange={list.setSiteId}
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
            <EmployeeSiteTableSkeleton rows={8} />
          </div>
        ) : list.employees.length === 0 ? (
          <div className={cx('flex flex-1 flex-col transition-opacity duration-200', list.isFetching ? 'opacity-70' : 'opacity-100')}>
            <EmployeeSitesEmptyState
              segment={list.segment}
              searchTerm={list.searchInput}
              isFiltered={list.hasActiveFilters}
              onClear={list.clearFilters}
            />
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <EmployeeSiteTable employees={list.employees} canAssign={canAssign} onOpen={(emp) => setOpenId(emp.id)} />
            </div>

            <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <EmployeeSiteCardList employees={list.employees} canAssign={canAssign} onOpen={(emp) => setOpenId(emp.id)} />
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

      <EmployeeSiteDrawer open={openId !== null} editor={editor} canAssign={canAssign} onClose={() => setOpenId(null)} />
    </div>
  );
}
