'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { usePoliciesBasePath } from '../hooks/usePoliciesBasePath';
import { usePolicyList } from '../hooks/usePolicyList';
import { usePolicyMutations } from '../hooks/usePolicyMutations';
import { POLICY_PERMISSIONS } from '../constants/policies.constants';
import type { Policy, PolicyFormInput } from '../types/policies.model';
import { PoliciesToolbar } from './components/PoliciesToolbar';
import { PolicyTable } from './components/PolicyTable';
import { PolicyCardList } from './components/PolicyCardList';
import { PolicyCreateWizard } from './components/PolicyCreateWizard';
import { ClonePolicyDialog } from './components/ClonePolicyDialog';
import { PolicyDeleteDialog } from './components/PolicyDeleteDialog';
import { PolicyTableSkeleton } from './components/PolicyTableSkeleton';
import { PoliciesEmptyState } from './components/PoliciesEmptyState';

function usePolicyPermissions() {
  const { can } = usePermission();
  return {
    canAdd: can(POLICY_PERMISSIONS.ADD),
    canEdit: can(POLICY_PERMISSIONS.EDIT),
    canDelete: can(POLICY_PERMISSIONS.DELETE),
  };
}

// One policy bundles work-hour rules, leave entitlement and payment cycle
// as one thing an employee is assigned to — matching the legacy
// attendance_policies / employees.attendance_policy_id model. There is no
// policy "kind" to filter by; every policy has all three sections,
// configured in the editor.
export function PoliciesPage() {
  const router = useRouter();
  const basePath = usePoliciesBasePath();
  const perms = usePolicyPermissions();

  const list = usePolicyList();
  const mutations = usePolicyMutations(list.refetch, list.updatePolicyStatusLocally);

  const [showCreate, setShowCreate] = React.useState(false);
  const [cloneTarget, setCloneTarget] = React.useState<Policy | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Policy | null>(null);

  const openCreate = () => setShowCreate(true);
  const closeCreate = () => {
    setShowCreate(false);
    mutations.clearFieldError();
  };

  const handleCreate = async (input: PolicyFormInput) => {
    const ok = await mutations.createPolicy(input);
    if (ok) closeCreate();
  };

  const openEditor = (policy: Policy) => router.push(`${basePath}/${policy.id}`);

  const closeClone = () => setCloneTarget(null);
  const confirmClone = async (name: string) => {
    if (!cloneTarget) return;
    const ok = await mutations.clonePolicy(cloneTarget.id, name);
    if (ok) closeClone();
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    mutations.clearDeleteBlockedMessage();
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await mutations.deletePolicy(deleteTarget.id);
    if (ok) closeDelete();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PoliciesToolbar
        title="Policies"
        total={list.policies.length}
        searchValue={list.searchInput}
        onSearchChange={list.setSearchInput}
        status={list.status}
        onStatusChange={list.setStatus}
        subOrgId={list.subOrgId}
        onSubOrgChange={list.setSubOrgId}
        canAdd={perms.canAdd}
        onAdd={openCreate}
        onOpenLeaveTypes={basePath === '/org-admin/policies' ? () => router.push(`${basePath}/leave-types`) : undefined}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && (
          <div className="border-b border-line p-3">
            <Alert message={list.error} tone="error" />
          </div>
        )}

        {list.isInitialLoading ? (
          <div className="flex-1 overflow-hidden">
            <PolicyTableSkeleton rows={6} />
          </div>
        ) : list.policies.length === 0 ? (
          <div className={cx('flex flex-1 flex-col transition-opacity duration-200', list.isFetching ? 'opacity-70' : 'opacity-100')}>
            <PoliciesEmptyState status={list.status} canAdd={perms.canAdd} onAdd={openCreate} searchTerm={list.searchInput} onClear={list.clearFilters} />
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <PolicyTable
                policies={list.policies}
                canEdit={perms.canEdit}
                canAdd={perms.canAdd}
                canDelete={perms.canDelete}
                onEdit={openEditor}
                onClone={setCloneTarget}
                onDelete={setDeleteTarget}
                onToggleStatus={(p) => mutations.updateStatus(p, p.status === 'active' ? 'inactive' : 'active')}
                togglingId={mutations.togglingId}
              />
            </div>
            <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <PolicyCardList
                policies={list.policies}
                canEdit={perms.canEdit}
                canAdd={perms.canAdd}
                canDelete={perms.canDelete}
                onEdit={openEditor}
                onClone={setCloneTarget}
                onDelete={setDeleteTarget}
                onToggleStatus={(p) => mutations.updateStatus(p, p.status === 'active' ? 'inactive' : 'active')}
                togglingId={mutations.togglingId}
              />
            </div>
          </>
        )}
      </div>

      <PolicyCreateWizard open={showCreate} isSaving={mutations.isSaving} fieldError={mutations.fieldError} onClose={closeCreate} onSubmit={handleCreate} />
      <ClonePolicyDialog open={Boolean(cloneTarget)} policy={cloneTarget} isSaving={mutations.isSaving} onClose={closeClone} onConfirm={confirmClone} />
      <PolicyDeleteDialog
        open={Boolean(deleteTarget)}
        policy={deleteTarget}
        isDeleting={mutations.isSaving}
        blockedMessage={mutations.deleteBlockedMessage}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
