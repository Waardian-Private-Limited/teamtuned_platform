'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { useDepartmentList } from '../hooks/useDepartmentList';
import { useDepartmentMutations } from '../hooks/useDepartmentMutations';
import { useDepartmentHeads } from '../hooks/useDepartmentHeads';
import { DEPARTMENT_PERMISSIONS } from '../constants/departments.constants';
import type { Department, DepartmentFormInput } from '../types/departments.model';
import { DepartmentsToolbar } from './components/DepartmentsToolbar';
import { DepartmentTable } from './components/DepartmentTable';
import { DepartmentCardList } from './components/DepartmentCardList';
import { DepartmentFormDialog } from './components/DepartmentFormDialog';
import { DepartmentDeleteDialog } from './components/DepartmentDeleteDialog';
import { DepartmentHeadsDrawer } from './components/DepartmentHeadsDrawer';
import { DepartmentTableSkeleton } from './components/DepartmentTableSkeleton';
import { DepartmentsEmptyState } from './components/DepartmentsEmptyState';

// OrgAdmin (and SuperAdmin) always pass server-side (authorizeOrgAdminOrPermissions
// bypasses them); this mirrors that client-side so an Employee without a given
// DEPT_* permission simply doesn't see the corresponding action, matching the
// legacy page's per-button gating.
function useDepartmentPermissions() {
  const { role, permissions } = useAuth();
  const hasPerm = React.useCallback(
    (code: string) => (permissions || []).some((p) => (p || '').toUpperCase() === code.toUpperCase()),
    [permissions]
  );
  const isOrgAdmin = (role || '') !== 'Employee';
  return {
    canAdd: isOrgAdmin || hasPerm(DEPARTMENT_PERMISSIONS.ADD),
    canEdit: isOrgAdmin || hasPerm(DEPARTMENT_PERMISSIONS.EDIT),
    canDelete: isOrgAdmin || hasPerm(DEPARTMENT_PERMISSIONS.DELETE),
  };
}

export function DepartmentsPage() {
  const perms = useDepartmentPermissions();
  const list = useDepartmentList();
  const mutations = useDepartmentMutations(list.refetch, list.updateDepartmentStatusLocally);

  const [formState, setFormState] = React.useState<{ mode: 'create' | 'edit'; department?: Department } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Department | null>(null);
  const [headsDepartmentId, setHeadsDepartmentId] = React.useState<number | null>(null);

  const heads = useDepartmentHeads(headsDepartmentId, list.refetch);

  const openCreate = () => setFormState({ mode: 'create' });
  const openEdit = (department: Department) => setFormState({ mode: 'edit', department });
  const closeForm = () => {
    setFormState(null);
    mutations.clearFieldError();
  };

  const handleSubmitForm = async (input: DepartmentFormInput) => {
    const ok =
      formState?.mode === 'edit' && formState.department
        ? await mutations.updateDepartment(formState.department.id, input)
        : await mutations.createDepartment(input);
    if (ok) closeForm();
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    mutations.clearDeleteBlockedMessage();
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await mutations.deleteDepartment(deleteTarget.id);
    if (ok) closeDelete();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <DepartmentsToolbar
        total={list.total}
        searchValue={list.searchInput}
        onSearchChange={list.setSearchInput}
        status={list.status}
        onStatusChange={list.setStatus}
        canAdd={perms.canAdd}
        onAdd={openCreate}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && (
          <div className="border-b border-line p-3">
            <Alert message={list.error} tone="error" />
          </div>
        )}

        {/* Subtle non-intrusive progress line during background fetches */}
        {list.isFetching && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-0.5 overflow-hidden bg-transparent">
            <div className="h-full w-full animate-pulse bg-[var(--tt-primary)]" />
          </div>
        )}

        {list.isInitialLoading ? (
          <div className="flex-1 overflow-hidden">
            <DepartmentTableSkeleton rows={6} />
          </div>
        ) : list.departments.length === 0 ? (
          <div
            className={cx(
              'flex flex-1 flex-col transition-opacity duration-200',
              list.isFetching ? 'opacity-70' : 'opacity-100'
            )}
          >
            <DepartmentsEmptyState
              status={list.status}
              canAdd={perms.canAdd}
              onAdd={openCreate}
              searchTerm={list.searchInput}
              onClear={list.clearFilters}
            />
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Scrollable Table */}
            <div
              className={cx(
                'hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block',
                list.isFetching ? 'opacity-75' : 'opacity-100'
              )}
            >
              <DepartmentTable
                departments={list.departments}
                canEdit={perms.canEdit}
                canDelete={perms.canDelete}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onToggleStatus={mutations.toggleStatus}
                onOpenHeads={(d) => setHeadsDepartmentId(d.id)}
                togglingId={mutations.togglingId}
              />
            </div>

            {/* Mobile Scrollable Cards */}
            <div
              className={cx(
                'min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden',
                list.isFetching ? 'opacity-75' : 'opacity-100'
              )}
            >
              <DepartmentCardList
                departments={list.departments}
                canEdit={perms.canEdit}
                canDelete={perms.canDelete}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onToggleStatus={mutations.toggleStatus}
                onOpenHeads={(d) => setHeadsDepartmentId(d.id)}
                togglingId={mutations.togglingId}
              />
            </div>

            {/* Integrated Pagination Footer */}
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

      <DepartmentFormDialog
        open={Boolean(formState)}
        mode={formState?.mode ?? 'create'}
        initial={formState?.department}
        isSaving={mutations.isSaving}
        fieldError={mutations.fieldError}
        onClose={closeForm}
        onSubmit={handleSubmitForm}
      />

      <DepartmentDeleteDialog
        open={Boolean(deleteTarget)}
        department={deleteTarget}
        isDeleting={mutations.isSaving}
        blockedMessage={mutations.deleteBlockedMessage}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />

      <DepartmentHeadsDrawer
        open={headsDepartmentId !== null}
        panel={heads.panel}
        isLoading={heads.isLoading}
        isSaving={heads.isSaving}
        candidates={heads.candidates}
        candidatesLoading={heads.candidatesLoading}
        onSearchCandidates={heads.searchCandidates}
        onAssign={heads.assignHead}
        onRemove={heads.removeHead}
        onClose={() => setHeadsDepartmentId(null)}
      />
    </div>
  );
}
