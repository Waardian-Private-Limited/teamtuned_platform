'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { usePermission } from '@/lib/hooks/usePermission';
import { useSubOrganizationList } from '../hooks/useSubOrganizationList';
import { useSubOrganizationMutations } from '../hooks/useSubOrganizationMutations';
import { SubOrganizationsToolbar } from './components/SubOrganizationsToolbar';
import { SubOrganizationTable } from './components/SubOrganizationTable';
import { SubOrganizationCardList } from './components/SubOrganizationCardList';
import { SubOrganizationFormDialog } from './components/SubOrganizationFormDialog';
import { SubOrganizationDeleteDialog } from './components/SubOrganizationDeleteDialog';
import { SubOrganizationsEmptyState } from './components/SubOrganizationsEmptyState';
import { SubOrganizationTableSkeleton } from './components/SubOrganizationTableSkeleton';
import { SUB_ORG_PERMISSIONS } from '../constants/sub-organizations.constants';
import type { SubOrganization, SubOrganizationFormInput } from '../types/sub-organizations.model';

export function SubOrganizationsPage() {
  const { can } = usePermission();
  const perms = {
    canAdd: can(SUB_ORG_PERMISSIONS.ADD),
    canEdit: can(SUB_ORG_PERMISSIONS.EDIT),
    canDelete: can(SUB_ORG_PERMISSIONS.DELETE),
  };

  const list = useSubOrganizationList();
  const mutations = useSubOrganizationMutations(list.refetch, list.updateStatusLocally);

  const [formState, setFormState] = React.useState<{ mode: 'create' | 'edit'; subOrg?: SubOrganization } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<SubOrganization | null>(null);

  const closeForm = () => {
    setFormState(null);
    mutations.clearFieldError();
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    mutations.clearDeleteBlockedMessage();
  };

  const submitForm = async (input: SubOrganizationFormInput) => {
    const ok = formState?.mode === 'edit' && formState.subOrg
      ? await mutations.updateSubOrganization(formState.subOrg.id, input)
      : await mutations.createSubOrganization(input);
    if (ok) closeForm();
  };

  const rowProps = {
    subOrganizations: list.subOrganizations,
    canEdit: perms.canEdit,
    canDelete: perms.canDelete,
    settingPrimaryId: mutations.settingPrimaryId,
    togglingId: mutations.togglingId,
    onEdit: (subOrg: SubOrganization) => setFormState({ mode: 'edit', subOrg }),
    onDelete: setDeleteTarget,
    onToggleStatus: mutations.toggleStatus,
    onSetPrimary: mutations.setPrimary,
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <SubOrganizationsToolbar
        total={list.total}
        searchInput={list.searchInput}
        onSearchChange={list.setSearchInput}
        status={list.status}
        onStatusChange={list.setStatus}
        canAdd={perms.canAdd}
        onCreate={() => setFormState({ mode: 'create' })}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && (
          <div className="border-b border-line p-3">
            <Alert message={list.error} tone="error" />
          </div>
        )}

        {list.isInitialLoading ? (
          <div className="flex-1 overflow-hidden">
            <SubOrganizationTableSkeleton rows={6} />
          </div>
        ) : list.subOrganizations.length === 0 ? (
          <div
            className={cx(
              'flex flex-1 flex-col transition-opacity duration-200',
              list.isFetching ? 'opacity-70' : 'opacity-100'
            )}
          >
            <SubOrganizationsEmptyState
              status={list.status}
              searchTerm={list.searchInput}
              canAdd={perms.canAdd}
              onAdd={() => setFormState({ mode: 'create' })}
              onClear={list.clearFilters}
            />
          </div>
        ) : (
          <>
            <div
              className={cx(
                'hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block',
                list.isFetching ? 'opacity-75' : 'opacity-100'
              )}
            >
              <SubOrganizationTable {...rowProps} />
            </div>

            <div
              className={cx(
                'min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden',
                list.isFetching ? 'opacity-75' : 'opacity-100'
              )}
            >
              <SubOrganizationCardList {...rowProps} />
            </div>

            {list.total > 0 && (
              <div className="border-t border-line bg-surface px-4 py-2.5">
                <Pagination
                  currentPage={list.page}
                  totalPages={list.pages}
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

      <SubOrganizationFormDialog
        open={Boolean(formState)}
        mode={formState?.mode ?? 'create'}
        initial={formState?.subOrg}
        isSaving={mutations.isSaving}
        fieldError={mutations.fieldError}
        onClose={closeForm}
        onSubmit={submitForm}
      />

      <SubOrganizationDeleteDialog
        open={Boolean(deleteTarget)}
        target={deleteTarget}
        isSaving={mutations.isSaving}
        blockedMessage={mutations.deleteBlockedMessage}
        onClose={closeDelete}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const ok = await mutations.deleteSubOrganization(deleteTarget);
          if (ok) closeDelete();
        }}
      />
    </div>
  );
}

export default SubOrganizationsPage;
