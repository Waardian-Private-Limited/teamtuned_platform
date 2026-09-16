'use client';

import React from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import * as departmentsApi from '@/features/departments/api/departments.api';
import { useRoleList } from '../hooks/useRoleList';
import { useRoleMutations } from '../hooks/useRoleMutations';
import { usePermissionCatalog } from '../hooks/usePermissionCatalog';
import { usePermissionSets } from '../hooks/usePermissionSets';
import { useRoleDetail } from '../hooks/useRoleDetail';
import { useRoleEmployees } from '../hooks/useRoleEmployees';
import { useBulkPermissions } from '../hooks/useBulkPermissions';
import { ROLE_PERMISSIONS } from '../constants/roles.constants';
import * as rolesApi from '../api/roles.api';
import { toRoleList } from '../types/roles.mapper';
import type { Role, RoleFormInput } from '../types/roles.model';
import { RolesToolbar } from './components/RolesToolbar';
import { RoleTable } from './components/RoleTable';
import { RoleCardList } from './components/RoleCardList';
import { RoleFormDialog } from './components/RoleFormDialog';
import { RoleDeleteDialog } from './components/RoleDeleteDialog';
import { CloneRoleDialog } from './components/CloneRoleDialog';
import { RoleDetailDrawer } from './components/RoleDetailDrawer';
import { RoleEmployeesDrawer } from './components/RoleEmployeesDrawer';
import { BulkPermissionsDrawer } from './components/BulkPermissionsDrawer';
import { PermissionSetsDialog } from './components/PermissionSetsDialog';
import { RoleTableSkeleton } from './components/RoleTableSkeleton';
import { RolesEmptyState } from './components/RolesEmptyState';

function useRolePermissions() {
  const { can } = usePermission();
  return {
    canAdd: can(ROLE_PERMISSIONS.ADD),
    canEdit: can(ROLE_PERMISSIONS.EDIT),
    canDelete: can(ROLE_PERMISSIONS.DELETE),
  };
}

export function RolesPage() {
  const perms = useRolePermissions();
  const list = useRoleList();
  const mutations = useRoleMutations(list.refetch, list.updateRoleStatusLocally);
  const catalog = usePermissionCatalog();
  const sets = usePermissionSets();

  const [departments, setDepartments] = React.useState<Array<{ id: number; name: string }>>([]);
  React.useEffect(() => {
    departmentsApi.listDepartments({ pageSize: 100 }).then((dto) => {
      setDepartments(dto.departments.map((d) => ({ id: d.id, name: d.name })));
    }).catch(() => {});
  }, []);

  // Full unpaginated role list for the bulk-apply drawer's role picker.
  const [allRoles, setAllRoles] = React.useState<Role[]>([]);
  const loadAllRoles = React.useCallback(() => {
    rolesApi.listRoles({ pageSize: 100 }).then((dto) => setAllRoles(toRoleList(dto).roles)).catch(() => {});
  }, []);
  React.useEffect(() => { loadAllRoles(); }, [loadAllRoles, list.total]);

  const [formState, setFormState] = React.useState<{ mode: 'create' | 'edit'; role?: Role } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Role | null>(null);
  const [cloneTarget, setCloneTarget] = React.useState<Role | null>(null);
  const [detailRoleId, setDetailRoleId] = React.useState<number | null>(null);
  const [employeesRoleId, setEmployeesRoleId] = React.useState<number | null>(null);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [setsOpen, setSetsOpen] = React.useState(false);

  const detail = useRoleDetail(detailRoleId);
  const employeesRole = allRoles.find((r) => r.id === employeesRoleId) || list.roles.find((r) => r.id === employeesRoleId) || null;
  const employees = useRoleEmployees(employeesRoleId, () => { list.refetch(); loadAllRoles(); });
  const bulk = useBulkPermissions(() => { list.refetch(); loadAllRoles(); });

  const openCreate = () => setFormState({ mode: 'create' });
  const openEdit = (role: Role) => setFormState({ mode: 'edit', role });
  const closeForm = () => {
    setFormState(null);
    mutations.clearFieldError();
  };

  const handleSubmitForm = async (input: RoleFormInput) => {
    const ok = formState?.mode === 'edit' && formState.role
      ? await mutations.updateRole(formState.role.id, input)
      : await mutations.createRole(input);
    if (ok) closeForm();
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    mutations.clearDeleteBlockedMessage();
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await mutations.deleteRole(deleteTarget.id);
    if (ok) closeDelete();
  };

  const confirmClone = async (name: string) => {
    if (!cloneTarget) return;
    const ok = await mutations.cloneRole(cloneTarget, name);
    if (ok) setCloneTarget(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <RolesToolbar
        total={list.total}
        searchValue={list.searchInput}
        onSearchChange={list.setSearchInput}
        status={list.status}
        onStatusChange={list.setStatus}
        departments={departments}
        departmentId={list.departmentId}
        onDepartmentChange={list.setDepartmentId}
        canAdd={perms.canAdd}
        onAdd={openCreate}
        canBulk={perms.canEdit}
        onBulk={() => setBulkOpen(true)}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && (
          <div className="border-b border-line p-3">
            <Alert message={list.error} tone="error" />
          </div>
        )}

        {list.isFetching && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-0.5 overflow-hidden bg-transparent">
            <div className="h-full w-full animate-pulse bg-[var(--tt-primary)]" />
          </div>
        )}

        {list.isInitialLoading ? (
          <div className="flex-1 overflow-hidden">
            <RoleTableSkeleton rows={6} />
          </div>
        ) : list.roles.length === 0 ? (
          <div className={cx('flex flex-1 flex-col transition-opacity duration-200', list.isFetching ? 'opacity-70' : 'opacity-100')}>
            <RolesEmptyState
              status={list.status}
              canAdd={perms.canAdd}
              onAdd={openCreate}
              searchTerm={list.searchInput}
              departmentName={departments.find((d) => d.id === list.departmentId)?.name}
              hasDepartmentFilter={Boolean(list.departmentId)}
              onClear={list.clearFilters}
            />
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <RoleTable
                roles={list.roles}
                canEdit={perms.canEdit}
                canAdd={perms.canAdd}
                canDelete={perms.canDelete}
                onView={(role) => setDetailRoleId(role.id)}
                onEdit={openEdit}
                onClone={setCloneTarget}
                onDelete={setDeleteTarget}
                onToggleStatus={mutations.toggleStatus}
                onOpenEmployees={(role) => setEmployeesRoleId(role.id)}
                togglingId={mutations.togglingId}
              />
            </div>

            <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <RoleCardList
                roles={list.roles}
                canEdit={perms.canEdit}
                canAdd={perms.canAdd}
                canDelete={perms.canDelete}
                onView={(role) => setDetailRoleId(role.id)}
                onEdit={openEdit}
                onClone={setCloneTarget}
                onDelete={setDeleteTarget}
                onToggleStatus={mutations.toggleStatus}
                onOpenEmployees={(role) => setEmployeesRoleId(role.id)}
                togglingId={mutations.togglingId}
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

      <RoleFormDialog
        open={Boolean(formState)}
        mode={formState?.mode ?? 'create'}
        initial={formState?.role}
        departments={departments}
        categories={catalog.categories}
        categoriesLoading={catalog.isLoading}
        isSaving={mutations.isSaving}
        fieldError={mutations.fieldError}
        onClose={closeForm}
        onSubmit={handleSubmitForm}
      />

      <RoleDeleteDialog
        open={Boolean(deleteTarget)}
        role={deleteTarget}
        isDeleting={mutations.isSaving}
        blockedMessage={mutations.deleteBlockedMessage}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />

      <CloneRoleDialog
        open={Boolean(cloneTarget)}
        role={cloneTarget}
        isSaving={mutations.isSaving}
        onClose={() => setCloneTarget(null)}
        onConfirm={confirmClone}
      />

      <RoleDetailDrawer
        open={detailRoleId !== null}
        detail={detail.detail}
        isLoading={detail.isLoading}
        audit={detail.audit}
        auditLoading={detail.auditLoading}
        onAuditPageChange={detail.setAuditPage}
        onClose={() => setDetailRoleId(null)}
      />

      <RoleEmployeesDrawer
        open={employeesRoleId !== null}
        role={employeesRole}
        holders={employees.holders}
        candidates={employees.candidates}
        isLoading={employees.isLoading}
        candidatesLoading={employees.candidatesLoading}
        isSaving={employees.isSaving}
        onSearch={employees.searchCandidates}
        onAssign={employees.assign}
        onRemove={employees.remove}
        onClose={() => setEmployeesRoleId(null)}
      />

      <BulkPermissionsDrawer
        open={bulkOpen}
        roles={allRoles}
        sets={sets.sets}
        categories={catalog.categories}
        categoriesLoading={catalog.isLoading}
        isPreviewing={bulk.isPreviewing}
        isApplying={bulk.isApplying}
        preview={bulk.preview}
        onPreview={(roleIds, setIds, extraCodes, action) => bulk.runPreview(roleIds, setIds, extraCodes, action)}
        onApply={(roleIds, setIds, extraCodes, action) => bulk.apply(roleIds, setIds, extraCodes, action)}
        onManageSets={() => setSetsOpen(true)}
        onClose={() => { setBulkOpen(false); bulk.reset(); }}
      />

      <PermissionSetsDialog
        open={setsOpen}
        sets={sets.sets}
        categories={catalog.categories}
        categoriesLoading={catalog.isLoading}
        isSaving={sets.isSaving}
        fieldError={sets.fieldError}
        onClose={() => setSetsOpen(false)}
        onCreate={sets.createSet}
        onUpdate={sets.updateSet}
        onDelete={sets.deleteSet}
      />
    </div>
  );
}
