'use client';

import React from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { useMappingList } from '../hooks/useMappingList';
import { useMappingMutations } from '../hooks/useMappingMutations';
import { loadSubOrgOptions } from '../api/pickerLoaders';
import { MAPPER_PERMISSIONS, PAGE_SIZE_OPTIONS } from '../constants/siteSubOrgMapper.constants';
import type { Mapping, MappingFormInput, PickerOption } from '../types/siteSubOrgMapper.model';
import { MapperToolbar } from './components/MapperToolbar';
import { MappingTable } from './components/MappingTable';
import { MappingCardList } from './components/MappingCardList';
import { MappingFormDialog } from './components/MappingFormDialog';
import { MappingDeleteDialog } from './components/MappingDeleteDialog';
import { MappingTableSkeleton } from './components/MappingTableSkeleton';
import { MappingsEmptyState } from './components/MappingsEmptyState';

// Mirrors the backend guards: creating needs SITE_ADD or SITE_EDIT, while
// deleting a mapping needs SITE_EDIT. A mapping has nothing to edit.
function useMapperPermissions() {
  const { can } = usePermission();
  const canEdit = can(MAPPER_PERMISSIONS.EDIT);
  return {
    canAdd: canEdit || can(MAPPER_PERMISSIONS.ADD),
    canDelete: canEdit,
  };
}

export function SiteSubOrgMapperPage() {
  const perms = useMapperPermissions();
  const list = useMappingList();
  const mutations = useMappingMutations(list.refetch);

  // Sub-orgs in the user's scope, for the toolbar filter and to preselect the
  // only one in the create form.
  const [subOrgOptions, setSubOrgOptions] = React.useState<PickerOption[]>([]);
  React.useEffect(() => {
    loadSubOrgOptions('').then(setSubOrgOptions).catch(() => {});
  }, []);

  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Mapping | null>(null);

  const openCreate = () => setFormOpen(true);
  const closeForm = () => {
    setFormOpen(false);
    mutations.clearFieldErrors();
  };

  const handleSubmitForm = async (input: MappingFormInput) => {
    const ok = await mutations.createMapping(input);
    if (ok) closeForm();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await mutations.deleteMapping(deleteTarget.id);
    if (ok) setDeleteTarget(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <MapperToolbar
        total={list.total}
        searchValue={list.searchInput}
        onSearchChange={list.setSearchInput}
        subOrgOptions={subOrgOptions}
        subOrgId={list.subOrgId}
        onSubOrgChange={list.setSubOrgId}
        site={list.site}
        onSiteChange={list.setSite}
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
          <div className="flex-1 overflow-hidden">
            <MappingTableSkeleton rows={6} />
          </div>
        ) : list.mappings.length === 0 ? (
          <div className={cx('flex flex-1 flex-col transition-opacity duration-200', list.isFetching ? 'opacity-70' : 'opacity-100')}>
            <MappingsEmptyState
              canAdd={perms.canAdd}
              onAdd={openCreate}
              searchTerm={list.searchInput}
              hasFilters={list.hasActiveFilters}
              onClear={list.clearFilters}
            />
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <MappingTable
                mappings={list.mappings}
                canDelete={perms.canDelete}
                onDelete={setDeleteTarget}
              />
            </div>

            <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <MappingCardList
                mappings={list.mappings}
                canDelete={perms.canDelete}
                onDelete={setDeleteTarget}
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
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                />
              </div>
            )}
          </>
        )}
      </div>

      <MappingFormDialog
        open={formOpen}
        subOrgOptions={subOrgOptions}
        isSaving={mutations.isSaving}
        fieldErrors={mutations.fieldErrors}
        onClearFieldError={mutations.clearFieldError}
        onClose={closeForm}
        onSubmit={handleSubmitForm}
      />

      <MappingDeleteDialog
        open={Boolean(deleteTarget)}
        mapping={deleteTarget}
        isDeleting={mutations.isSaving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
