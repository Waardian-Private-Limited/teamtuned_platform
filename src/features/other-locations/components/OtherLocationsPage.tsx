'use client';

import React from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { useOtherLocationList } from '../hooks/useOtherLocationList';
import { useOtherLocationMutations } from '../hooks/useOtherLocationMutations';
import { OTHER_LOCATION_PERMISSIONS } from '../constants/otherLocations.constants';
import type { OtherLocation, OtherLocationFormInput } from '../types/otherLocations.model';
import { OtherLocationsToolbar } from './components/OtherLocationsToolbar';
import { OtherLocationTable } from './components/OtherLocationTable';
import { OtherLocationCardList } from './components/OtherLocationCardList';
import { OtherLocationFormDialog } from './components/OtherLocationFormDialog';
import { OtherLocationDeleteDialog } from './components/OtherLocationDeleteDialog';
import { OtherLocationTableSkeleton } from './components/OtherLocationTableSkeleton';
import { OtherLocationsEmptyState } from './components/OtherLocationsEmptyState';

export function OtherLocationsPage() {
  const { can } = usePermission();
  const perms = {
    canAdd: can(OTHER_LOCATION_PERMISSIONS.ADD),
    canEdit: can(OTHER_LOCATION_PERMISSIONS.EDIT),
    canDelete: can(OTHER_LOCATION_PERMISSIONS.DELETE),
  };

  const list = useOtherLocationList();
  const mutations = useOtherLocationMutations(list.refetch, list.updateStatusLocally);

  const [formState, setFormState] = React.useState<{ mode: 'create' | 'edit'; location?: OtherLocation } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<OtherLocation | null>(null);

  const openCreate = () => setFormState({ mode: 'create' });
  const openEdit = (location: OtherLocation) => setFormState({ mode: 'edit', location });
  const closeForm = () => {
    setFormState(null);
    mutations.clearFieldError();
  };

  const handleSubmitForm = async (input: OtherLocationFormInput) => {
    const ok =
      formState?.mode === 'edit' && formState.location
        ? await mutations.updateLocation(formState.location.id, input)
        : await mutations.createLocation(input);
    if (ok) closeForm();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await mutations.deleteLocation(deleteTarget.id);
    if (ok) setDeleteTarget(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <OtherLocationsToolbar
        total={list.total}
        searchValue={list.searchInput}
        onSearchChange={list.setSearchInput}
        status={list.status}
        onStatusChange={list.setStatus}
        type={list.type}
        onTypeChange={list.setType}
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
            <OtherLocationTableSkeleton rows={6} />
          </div>
        ) : list.locations.length === 0 ? (
          <div className={cx('flex flex-1 flex-col transition-opacity duration-200', list.isFetching ? 'opacity-70' : 'opacity-100')}>
            <OtherLocationsEmptyState
              status={list.status}
              canAdd={perms.canAdd}
              onAdd={openCreate}
              searchTerm={list.searchInput}
              isFiltered={list.hasActiveFilters}
              onClear={list.clearFilters}
            />
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <OtherLocationTable
                locations={list.locations}
                canEdit={perms.canEdit}
                canDelete={perms.canDelete}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onToggleStatus={mutations.toggleStatus}
                togglingId={mutations.togglingId}
              />
            </div>

            <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <OtherLocationCardList
                locations={list.locations}
                canEdit={perms.canEdit}
                canDelete={perms.canDelete}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onToggleStatus={mutations.toggleStatus}
                togglingId={mutations.togglingId}
              />
            </div>
          </>
        )}
      </div>

      <OtherLocationFormDialog
        open={Boolean(formState)}
        mode={formState?.mode ?? 'create'}
        initial={formState?.location}
        isSaving={mutations.isSaving}
        fieldError={mutations.fieldError}
        onClose={closeForm}
        onSubmit={handleSubmitForm}
      />

      <OtherLocationDeleteDialog
        open={Boolean(deleteTarget)}
        location={deleteTarget}
        isDeleting={mutations.isSaving}
        blockedMessage={mutations.deleteBlockedMessage}
        onClose={() => {
          setDeleteTarget(null);
          mutations.clearDeleteBlockedMessage();
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default OtherLocationsPage;
