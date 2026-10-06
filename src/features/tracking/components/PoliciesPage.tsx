'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { cx } from '@/theme/tokens';
import { usePermission } from '@/lib/hooks/usePermission';
import { messageOf } from '@/lib/api/errors';
import {
  archivePolicy,
  createPolicy,
  deletePolicy,
  listPolicies,
  restorePolicy,
} from '../api/tracking.api';
import { TRACKING_PERMISSIONS } from '../constants/tracking.constants';
import type { TrackingPolicyDto } from '../types/tracking.dto';
import {
  TrackingPoliciesToolbar,
  type TrackingPolicyStatusFilter,
} from './components/TrackingPoliciesToolbar';
import { TrackingPolicyTable } from './components/TrackingPolicyTable';
import { TrackingPolicyCardList } from './components/TrackingPolicyCardList';
import { TrackingPoliciesEmptyState } from './components/TrackingPoliciesEmptyState';
import { TrackingPolicyTableSkeleton } from './components/TrackingPolicyTableSkeleton';
import { TrackingPolicyDeleteDialog } from './components/TrackingPolicyDeleteDialog';
import { CloneTrackingPolicyDialog } from './components/CloneTrackingPolicyDialog';
import { TrackingPolicyCreateWizard } from './components/TrackingPolicyCreateWizard';

export function PoliciesPage() {
  const router = useRouter();
  const { can } = usePermission();
  const canManage = can(TRACKING_PERMISSIONS.POLICY);

  const [allPolicies, setAllPolicies] = useState<TrackingPolicyDto[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<TrackingPolicyStatusFilter>('all');
  const [subOrgId, setSubOrgId] = useState<number | null>(null);

  // Modals & Action targets
  const [showCreate, setShowCreate] = useState(false);
  const [cloneTarget, setCloneTarget] = useState<TrackingPolicyDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrackingPolicyDto | null>(null);
  const [deleteBlockedMessage, setDeleteBlockedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsFetching(true);
    try {
      // Fetch all policies including archived so client-side filter is instant
      const res = await listPolicies(subOrgId, true);
      setAllPolicies(res.policies);
      setError(null);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsFetching(false);
      setIsInitialLoading(false);
    }
  }, [subOrgId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Client-side search and status filter
  const filteredPolicies = useMemo(() => {
    return allPolicies.filter((p) => {
      // Status filter
      if (status === 'active' && p.status !== 'active') return false;
      if (status === 'archived' && p.status !== 'archived') return false;

      // Sub-org filter
      if (subOrgId !== null && p.sub_organization_id !== subOrgId) return false;

      // Search filter
      if (searchInput.trim()) {
        const q = searchInput.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = (p.description ?? '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    });
  }, [allPolicies, status, subOrgId, searchInput]);

  const clearFilters = () => {
    setSearchInput('');
    setStatus('all');
    setSubOrgId(null);
  };

  // Actions
  const openEditor = (policy: TrackingPolicyDto) => {
    router.push(`/org-admin/tracking/policies/${policy.id}`);
  };

  const handleCreate = async (input: {
    name: string;
    description?: string;
    subOrganizationId?: number | null;
    isDefault?: boolean;
    config: Record<string, unknown>;
  }) => {
    setIsSaving(true);
    try {
      const p = await createPolicy({
        name: input.name,
        description: input.description,
        subOrganizationId: input.subOrganizationId,
        isDefault: input.isDefault ?? allPolicies.length === 0,
        config: input.config,
      });
      setShowCreate(false);
      router.push(`/org-admin/tracking/policies/${p.id}`);
    } catch (err) {
      setError(messageOf(err));
      setIsSaving(false);
    }
  };

  const handleClone = async (name: string, clonedSubOrgId?: number | null) => {
    if (!cloneTarget) return;
    setIsSaving(true);
    try {
      await createPolicy({
        name,
        description: cloneTarget.description,
        config: cloneTarget.config,
        subOrganizationId: clonedSubOrgId,
        isDefault: false,
      });
      setCloneTarget(null);
      await load();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if ((deleteTarget.assigned ?? 0) > 0) {
      setDeleteBlockedMessage(
        `Cannot delete policy "${deleteTarget.name}". ${deleteTarget.assigned} employee${
          deleteTarget.assigned === 1 ? ' is' : 's are'
        } currently assigned. Reassign them before deleting.`
      );
      return;
    }

    setIsSaving(true);
    try {
      await deletePolicy(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteBlockedMessage(null);
      await load();
    } catch (err) {
      const msg = messageOf(err);
      if (msg.toLowerCase().includes('assigned') || msg.toLowerCase().includes('in use')) {
        setDeleteBlockedMessage(msg);
      } else {
        setError(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (policy: TrackingPolicyDto) => {
    setTogglingId(policy.id);
    try {
      if (policy.status === 'active') {
        if ((policy.assigned ?? 0) > 0) {
          setError(
            `Cannot archive policy "${policy.name}" while ${policy.assigned} employee${
              policy.assigned === 1 ? ' is' : 's are'
            } assigned. Move them to another policy first.`
          );
          return;
        }
        await archivePolicy(policy.id);
      } else {
        await restorePolicy(policy.id);
      }
      await load();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <TrackingPoliciesToolbar
        title="Tracking Policies"
        total={filteredPolicies.length}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        status={status}
        onStatusChange={setStatus}
        subOrgId={subOrgId}
        onSubOrgChange={setSubOrgId}
        canAdd={canManage}
        onAdd={() => setShowCreate(true)}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {error && (
          <div className="border-b border-line p-3">
            <Alert message={error} tone="error" />
          </div>
        )}

        {isInitialLoading ? (
          <div className="flex-1 overflow-hidden">
            <TrackingPolicyTableSkeleton rows={6} />
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div
            className={cx(
              'flex flex-1 flex-col transition-opacity duration-200',
              isFetching ? 'opacity-70' : 'opacity-100'
            )}
          >
            <TrackingPoliciesEmptyState
              status={status}
              canAdd={canManage}
              onAdd={() => setShowCreate(true)}
              searchTerm={searchInput}
              onClear={clearFilters}
            />
          </div>
        ) : (
          <>
            <div
              className={cx(
                'hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block',
                isFetching ? 'opacity-75' : 'opacity-100'
              )}
            >
              <TrackingPolicyTable
                policies={filteredPolicies}
                canManage={canManage}
                onEdit={openEditor}
                onClone={setCloneTarget}
                onDelete={(p) => {
                  setDeleteTarget(p);
                  setDeleteBlockedMessage(null);
                }}
                onToggleStatus={handleToggleStatus}
                togglingId={togglingId}
              />
            </div>
            <div
              className={cx(
                'min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden',
                isFetching ? 'opacity-75' : 'opacity-100'
              )}
            >
              <TrackingPolicyCardList
                policies={filteredPolicies}
                canManage={canManage}
                onEdit={openEditor}
                onClone={setCloneTarget}
                onDelete={(p) => {
                  setDeleteTarget(p);
                  setDeleteBlockedMessage(null);
                }}
                onToggleStatus={handleToggleStatus}
                togglingId={togglingId}
              />
            </div>
          </>
        )}
      </div>

      <TrackingPolicyCreateWizard
        open={showCreate}
        isSaving={isSaving}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
      />

      <CloneTrackingPolicyDialog
        open={Boolean(cloneTarget)}
        policy={cloneTarget}
        isSaving={isSaving}
        onClose={() => setCloneTarget(null)}
        onConfirm={handleClone}
      />

      <TrackingPolicyDeleteDialog
        open={Boolean(deleteTarget)}
        policy={deleteTarget}
        isDeleting={isSaving}
        blockedMessage={deleteBlockedMessage}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteBlockedMessage(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
