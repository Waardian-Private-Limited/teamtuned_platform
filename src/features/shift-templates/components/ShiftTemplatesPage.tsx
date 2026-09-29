'use client';

import React from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { useShiftTemplateList } from '../hooks/useShiftTemplateList';
import { useShiftTemplateMutations } from '../hooks/useShiftTemplateMutations';
import { SHIFT_PERMISSIONS } from '../constants/shiftTemplates.constants';
import type { ShiftTemplate, ShiftTemplateFormInput } from '../types/shiftTemplates.model';
import { ShiftTemplatesToolbar } from './components/ShiftTemplatesToolbar';
import { ShiftTemplateTable } from './components/ShiftTemplateTable';
import { ShiftTemplateCardList } from './components/ShiftTemplateCardList';
import { ShiftTemplateFormDialog } from './components/ShiftTemplateFormDialog';
import { ShiftTemplateDeleteDialog } from './components/ShiftTemplateDeleteDialog';
import { ShiftTemplatesEmptyState } from './components/ShiftTemplatesEmptyState';

function LoadingRows() {
  return (
    <div className="animate-pulse divide-y divide-line/60">
      {Array.from({ length: 6 }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-4 lg:px-5">
          <div className="h-3.5 rounded bg-bg-subtle" style={{ width: `${100 + (r % 3) * 30}px` }} />
          <div className="ml-auto h-3.5 w-40 rounded bg-bg-subtle/70" />
          <div className="h-5 w-16 rounded-full bg-bg-subtle" />
        </div>
      ))}
    </div>
  );
}

export function ShiftTemplatesPage() {
  const { can } = usePermission();
  const perms = {
    canAdd: can(SHIFT_PERMISSIONS.ADD),
    canEdit: can(SHIFT_PERMISSIONS.EDIT),
    canDelete: can(SHIFT_PERMISSIONS.DELETE),
  };
  const list = useShiftTemplateList();
  const mutations = useShiftTemplateMutations(list.refetch, list.updateStatusLocally);

  const [formState, setFormState] = React.useState<{ mode: 'create' | 'edit'; shift?: ShiftTemplate } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ShiftTemplate | null>(null);

  const openCreate = () => setFormState({ mode: 'create' });
  const openEdit = (shift: ShiftTemplate) => setFormState({ mode: 'edit', shift });
  const closeForm = () => {
    setFormState(null);
    mutations.clearFieldError();
  };

  const handleSubmitForm = async (input: ShiftTemplateFormInput) => {
    const ok = formState?.mode === 'edit' && formState.shift
      ? await mutations.updateShift(formState.shift.id, input)
      : await mutations.createShift(input);
    if (ok) closeForm();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (await mutations.deleteShift(deleteTarget.id)) setDeleteTarget(null);
  };

  const rowProps = {
    shifts: list.shifts,
    canEdit: perms.canEdit,
    canDelete: perms.canDelete,
    onEdit: openEdit,
    onDelete: setDeleteTarget,
    onToggleStatus: mutations.toggleStatus,
    togglingId: mutations.togglingId,
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ShiftTemplatesToolbar
        total={list.total}
        searchValue={list.searchInput}
        onSearchChange={list.setSearchInput}
        status={list.status}
        onStatusChange={list.setStatus}
        subOrgId={list.subOrgId}
        onSubOrgChange={list.setSubOrgId}
        canAdd={perms.canAdd}
        onAdd={openCreate}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && (
          <div className="border-b border-line p-3">
            <Alert message={list.error} tone="error" />
          </div>
        )}

        {list.isInitialLoading ? (
          <LoadingRows />
        ) : list.shifts.length === 0 ? (
          <div className={cx('flex flex-1 flex-col transition-opacity duration-200', list.isFetching ? 'opacity-70' : 'opacity-100')}>
            <ShiftTemplatesEmptyState
              status={list.status}
              searchTerm={list.searchInput}
              canAdd={perms.canAdd}
              onAdd={openCreate}
              onClear={list.clearFilters}
            />
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <ShiftTemplateTable {...rowProps} />
            </div>

            <div
              className={cx(
                'min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden',
                list.isFetching ? 'opacity-75' : 'opacity-100'
              )}
            >
              <ShiftTemplateCardList {...rowProps} />
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

      <ShiftTemplateFormDialog
        open={Boolean(formState)}
        mode={formState?.mode ?? 'create'}
        initial={formState?.shift}
        isSaving={mutations.isSaving}
        fieldError={mutations.fieldError}
        onClose={closeForm}
        onSubmit={handleSubmitForm}
      />

      <ShiftTemplateDeleteDialog
        open={Boolean(deleteTarget)}
        shift={deleteTarget}
        isDeleting={mutations.isSaving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
