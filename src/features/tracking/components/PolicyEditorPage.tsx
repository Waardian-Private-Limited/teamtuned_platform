'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Rocket, SquarePen } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { StatusPill } from '@/components/ui/StatusPill';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import { usePermission } from '@/lib/hooks/usePermission';
import { messageOf } from '@/lib/api/errors';
import type { SectionNode } from '@/features/policies/components/editor/form/schemaTypes';
import { getPolicy, getPolicySchema, updatePolicy } from '../api/tracking.api';
import { TRACKING_PERMISSIONS } from '../constants/tracking.constants';
import type { TrackingPolicyDto } from '../types/tracking.dto';
import { TrackingPolicyConfigEditor } from './editor/TrackingPolicyConfigEditor';
import { TrackingPolicyAssignments } from './editor/TrackingPolicyAssignments';
import { TrackingPolicyVersionHistory } from './editor/TrackingPolicyVersionHistory';
import { TrackingPolicyDetailsDialog } from './editor/TrackingPolicyDetailsDialog';
import { TrackingPolicyPublishDialog } from './editor/TrackingPolicyPublishDialog';
import { TrackingPolicyVersionDialog } from './editor/TrackingPolicyVersionDialog';

const secondaryButtonCls =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm';

export function PolicyEditorPage({ policyId }: { policyId: number }) {
  const router = useRouter();
  const { can } = usePermission();
  const canManage = can(TRACKING_PERMISSIONS.POLICY);

  const [policy, setPolicy] = useState<TrackingPolicyDto | null>(null);
  const [schema, setSchema] = useState<Record<string, SectionNode> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog states
  const [showDetails, setShowDetails] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showVersion, setShowVersion] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([getPolicy(policyId), getPolicySchema()]);
      setPolicy(p);
      setSchema(s.schema as unknown as Record<string, SectionNode>);
      setError(null);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [policyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaveConfig = async (nextConfig: Record<string, unknown>): Promise<boolean> => {
    if (!policy) return false;
    setIsSaving(true);
    setError(null);
    setSuccessNotice(null);
    try {
      const updated = await updatePolicy(policyId, {
        name: policy.name,
        description: policy.description,
        config: nextConfig,
        isDefault: policy.is_default,
        subOrganizationId: policy.sub_organization_id,
      });
      setPolicy(updated);
      setSuccessNotice(`Saved changes. Current revision is now r${updated.revision}.`);
      return true;
    } catch (err) {
      setError(messageOf(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDetails = async (input: {
    name: string;
    description: string;
    subOrganizationId: number | null;
    isDefault: boolean;
  }) => {
    if (!policy) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updatePolicy(policyId, {
        name: input.name,
        description: input.description,
        config: policy.config,
        subOrganizationId: input.subOrganizationId,
        isDefault: input.isDefault,
      });
      setPolicy(updated);
      setShowDetails(false);
      setSuccessNotice('Policy details updated successfully.');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishConfirm = async () => {
    if (!policy) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updatePolicy(policyId, {
        name: policy.name,
        description: policy.description,
        config: policy.config,
        subOrganizationId: policy.sub_organization_id,
        isDefault: policy.is_default,
      });
      setPolicy(updated);
      setShowPublish(false);
      setSuccessNotice(`Published revision r${updated.revision}. Devices will sync these rules.`);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-fg-muted">Loading tracking policy…</div>;
  }

  if (error && !policy) {
    return (
      <div className="p-4">
        <Alert message={error} tone="error" />
      </div>
    );
  }

  if (!policy || !schema) {
    return <div className="p-6 text-sm text-fg-muted">Policy not found.</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Top Header Bar matching attendance PolicyEditorPage */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/org-admin/tracking/policies')}
            className="rounded-lg border border-line p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
            aria-label="Back to policies"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg">{policy.name}</h1>
              <SubOrgBadge subOrgId={policy.sub_organization_id} />
              <StatusPill label={policy.status} tone={policy.status === 'active' ? 'active' : 'inactive'} />
              {policy.is_default && (
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                  Default
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-fg-muted">
              revision <code className="rounded bg-bg-subtle px-1 py-0.5">r{policy.revision}</code>
              {policy.assigned !== undefined && (
                <> · {policy.assigned} employee{policy.assigned === 1 ? '' : 's'} assigned</>
              )}
              {policy.updated_at && <> · updated {new Date(policy.updated_at).toLocaleDateString()}</>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <button type="button" onClick={() => setShowDetails(true)} className={secondaryButtonCls}>
              <SquarePen className="h-3.5 w-3.5" />
              <span>Edit details</span>
            </button>
          )}
          {canManage && policy.status === 'active' && (
            <button
              type="button"
              onClick={() => setShowPublish(true)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:text-sm"
            >
              <Rocket className="h-3.5 w-3.5" />
              <span>Publish changes (r{policy.revision + 1})</span>
            </button>
          )}
        </div>
      </div>

      {error && <Alert message={error} tone="error" />}
      {successNotice && <Alert message={successNotice} tone="success" />}
      {policy.status === 'archived' && (
        <Alert message="This policy is archived. Restore it from the policies list to activate." tone="info" />
      )}

      {/* 3-Column Layout matching attendance PolicyEditorPage */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto tt-scroll-hidden lg:grid-cols-3">
        {/* Left 2 Cols: Schema Form / Config Editor */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-line bg-surface p-3 sm:p-4">
            <TrackingPolicyConfigEditor
              config={policy.config}
              schema={schema}
              isSaving={isSaving}
              onSave={handleSaveConfig}
            />
          </div>
        </div>

        {/* Right 1 Col: Assignments & Version History */}
        <div className="flex flex-col gap-3 lg:col-span-1">
          <TrackingPolicyAssignments
            policyId={policyId}
            policyName={policy.name}
            isDefault={policy.is_default}
            canEdit={canManage}
            onRefresh={load}
          />
          <TrackingPolicyVersionHistory
            policy={policy}
            onView={() => setShowVersion(true)}
          />
        </div>
      </div>

      {/* Dialogs */}
      <TrackingPolicyDetailsDialog
        open={showDetails}
        policy={policy}
        isSaving={isSaving}
        onClose={() => setShowDetails(false)}
        onConfirm={handleUpdateDetails}
      />

      <TrackingPolicyPublishDialog
        open={showPublish}
        policyName={policy.name}
        currentRevision={policy.revision}
        assignedCount={policy.assigned ?? 0}
        isDefault={policy.is_default}
        isPublishing={isSaving}
        onClose={() => setShowPublish(false)}
        onConfirm={handlePublishConfirm}
      />

      <TrackingPolicyVersionDialog
        open={showVersion}
        policy={policy}
        onClose={() => setShowVersion(false)}
      />
    </div>
  );
}
