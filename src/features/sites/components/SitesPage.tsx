'use client';

import React from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { useSiteList } from '../hooks/useSiteList';
import { useSiteMutations } from '../hooks/useSiteMutations';
import { useSiteIncharges } from '../hooks/useSiteIncharges';
import { SITE_PERMISSIONS } from '../constants/sites.constants';
import type { Site, SiteFormInput } from '../types/sites.model';
import { SitesToolbar } from './components/SitesToolbar';
import { SiteTable } from './components/SiteTable';
import { SiteCardList } from './components/SiteCardList';
import { SiteFormDialog } from './components/SiteFormDialog';
import { SiteDeleteDialog } from './components/SiteDeleteDialog';
import { SiteBudgetDialog } from './components/SiteBudgetDialog';
import { SiteInchargesDrawer } from './components/SiteInchargesDrawer';
import { SiteTableSkeleton } from './components/SiteTableSkeleton';
import { SitesEmptyState } from './components/SitesEmptyState';

function useSitePermissions() {
  const { can } = usePermission();
  return {
    canAdd: can(SITE_PERMISSIONS.ADD),
    canEdit: can(SITE_PERMISSIONS.EDIT),
    canDelete: can(SITE_PERMISSIONS.DELETE),
  };
}

export function SitesPage() {
  const perms = useSitePermissions();
  const list = useSiteList();
  const mutations = useSiteMutations(list.refetch, list.updateSiteStatusLocally);

  const [formState, setFormState] = React.useState<{ mode: 'create' | 'edit'; site?: Site } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Site | null>(null);
  const [budgetSite, setBudgetSite] = React.useState<Site | null>(null);
  const [inchargesSite, setInchargesSite] = React.useState<Site | null>(null);

  const incharges = useSiteIncharges(inchargesSite?.id ?? null);

  const openCreate = () => setFormState({ mode: 'create' });
  const openEdit = (site: Site) => setFormState({ mode: 'edit', site });
  const closeForm = () => {
    setFormState(null);
    mutations.clearFieldError();
  };

  const handleSubmitForm = async (input: SiteFormInput) => {
    const ok =
      formState?.mode === 'edit' && formState.site
        ? await mutations.updateSite(formState.site.id, input)
        : await mutations.createSite(input);
    if (ok) closeForm();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await mutations.deleteSite(deleteTarget.id);
    if (ok) setDeleteTarget(null);
  };

  const openBudget = (site: Site) => setBudgetSite(site);

  const openBudgetEdit = (site: Site) => {
    setBudgetSite(null);
    openEdit(site);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <SitesToolbar
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

        {list.isInitialLoading ? (
          <div className="flex-1 overflow-hidden">
            <SiteTableSkeleton rows={6} />
          </div>
        ) : list.sites.length === 0 ? (
          <div
            className={cx(
              'flex flex-1 flex-col transition-opacity duration-200',
              list.isFetching ? 'opacity-70' : 'opacity-100'
            )}
          >
            <SitesEmptyState
              status={list.status}
              canAdd={perms.canAdd}
              onAdd={openCreate}
              searchTerm={list.searchInput}
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
              <SiteTable
                sites={list.sites}
                canEdit={perms.canEdit}
                canDelete={perms.canDelete}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onToggleStatus={mutations.toggleStatus}
                onOpenBudget={openBudget}
                onOpenIncharges={setInchargesSite}
                togglingId={mutations.togglingId}
              />
            </div>

            <div
              className={cx(
                'min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden',
                list.isFetching ? 'opacity-75' : 'opacity-100'
              )}
            >
              <SiteCardList
                sites={list.sites}
                canEdit={perms.canEdit}
                canDelete={perms.canDelete}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onToggleStatus={mutations.toggleStatus}
                onOpenBudget={openBudget}
                onOpenIncharges={setInchargesSite}
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

      <SiteFormDialog
        open={Boolean(formState)}
        mode={formState?.mode ?? 'create'}
        initial={formState?.site}
        isSaving={mutations.isSaving}
        fieldError={mutations.fieldError}
        onClose={closeForm}
        onSubmit={handleSubmitForm}
      />

      <SiteDeleteDialog
        open={Boolean(deleteTarget)}
        site={deleteTarget}
        isDeleting={mutations.isSaving}
        blockedMessage={mutations.deleteBlockedMessage}
        onClose={() => {
          setDeleteTarget(null);
          mutations.clearDeleteBlockedMessage();
        }}
        onConfirm={confirmDelete}
      />

      <SiteBudgetDialog
        open={Boolean(budgetSite)}
        site={budgetSite}
        canEdit={perms.canEdit}
        onClose={() => setBudgetSite(null)}
        onEditBudget={openBudgetEdit}
      />

      <SiteInchargesDrawer
        open={Boolean(inchargesSite)}
        site={inchargesSite}
        incharges={incharges.incharges}
        candidates={incharges.candidates}
        isLoading={incharges.isLoading}
        candidatesLoading={incharges.candidatesLoading}
        isSaving={incharges.isSaving}
        onSearch={incharges.searchCandidates}
        onAssign={incharges.assignIncharge}
        onRemove={incharges.removeIncharge}
        onClose={() => setInchargesSite(null)}
      />
    </div>
  );
}

export default SitesPage;
