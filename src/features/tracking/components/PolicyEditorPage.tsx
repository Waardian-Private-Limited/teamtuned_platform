'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Rocket, SquarePen } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { StatusPill } from '@/components/ui/StatusPill';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import { usePermission } from '@/lib/hooks/usePermission';
import { ApiError, messageOf } from '@/lib/api/errors';
import type { SectionNode } from '@/features/policies/components/editor/form/schemaTypes';
import { getPolicy, getPolicySchema, updatePolicy } from '../api/tracking.api';
import { TRACKING_PERMISSIONS } from '../constants/tracking.constants';
import type { TrackingPolicyDto } from '../types/tracking.dto';
import { TrackingPolicyConfigEditor, sameConfig, type ConfigEditorHandle, type SaveResult } from './editor/TrackingPolicyConfigEditor';
import { TrackingPolicyAssignments } from './editor/TrackingPolicyAssignments';
import { TrackingPolicyVersionHistory } from './editor/TrackingPolicyVersionHistory';
import { TrackingPolicyDetailsDialog } from './editor/TrackingPolicyDetailsDialog';
import { TrackingPolicyPublishDialog } from './editor/TrackingPolicyPublishDialog';
import { TrackingPolicyVersionDialog } from './editor/TrackingPolicyVersionDialog';
import { formatDate, orgDateOf } from '@/lib/datetime';

const LEAVE_PROMPT = 'You have unsaved policy changes. Leave without saving them?';

// The backend's validation lines ("sampling.movingIntervalSeconds: below minimum 5"), if this is one.
function violationsOf(err: unknown): string[] {
  const data = err instanceof ApiError ? (err.data as { errors?: unknown } | null) : null;
  return Array.isArray(data?.errors) ? data.errors.filter((e): e is string => typeof e === 'string') : [];
}

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

  // The editor keeps its own draft. It is replaced only when the page bumps resetToken: after a load,
  // save or publish, or when the server's config changed while the draft had no edits.
  const editorRef = useRef<ConfigEditorHandle>(null);
  const [editorBase, setEditorBase] = useState<Record<string, unknown>>({});
  const [resetToken, setResetToken] = useState(0);
  const [dirty, setDirty] = useState(false);
  const baseRef = useRef<Record<string, unknown> | null>(null);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const resetEditor = (config: Record<string, unknown>) => {
    baseRef.current = config;
    setEditorBase(config);
    setResetToken((t) => t + 1);
  };

  // A refreshed policy: take its config only if it changed and nothing is being edited.
  const syncFromServer = useCallback((p: TrackingPolicyDto) => {
    setPolicy(p);
    if (baseRef.current !== null && sameConfig(p.config, baseRef.current)) return;
    if (baseRef.current === null || !dirtyRef.current) {
      baseRef.current = p.config;
      setEditorBase(p.config);
      setResetToken((t) => t + 1);
    } else {
      setSuccessNotice(null);
      setError('This policy was changed elsewhere while you were editing. Saving or publishing will replace those changes.');
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([getPolicy(policyId), getPolicySchema()]);
      setError(null);
      syncFromServer(p);
      setSchema(s.schema as unknown as Record<string, SectionNode>);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [policyId, syncFromServer]);

  useEffect(() => {
    void load();
  }, [load]);

  // Leaving with unsaved edits asks first: closing / reloading the tab, and links inside the app.
  useEffect(() => {
    if (!dirty) return undefined;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    // Capture phase, so the prompt runs before Next's <Link> handler and can cancel it.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.origin !== window.location.origin) return;
      if (a.pathname === window.location.pathname && a.search === window.location.search) return;
      if (!window.confirm(LEAVE_PROMPT)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  const failWith = (err: unknown): SaveResult => {
    const errors = violationsOf(err);
    setError(errors.length ? 'The policy has invalid values. Fix the fields marked below.' : messageOf(err));
    return { ok: false, errors };
  };

  const handleSaveConfig = async (nextConfig: Record<string, unknown>, changeNote?: string): Promise<SaveResult> => {
    if (!policy) return { ok: false, errors: [] };
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
        changeNote,
      });
      setPolicy(updated);
      resetEditor(updated.config);
      setSuccessNotice(`Saved changes. Current revision is now r${updated.revision}.`);
      return { ok: true, errors: [] };
    } catch (err) {
      return failWith(err);
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
      // Details only: the saved config goes back unchanged and the draft in the editor is kept.
      const updated = await updatePolicy(policyId, {
        name: input.name,
        description: input.description,
        config: policy.config,
        subOrganizationId: input.subOrganizationId,
        isDefault: input.isDefault,
      });
      syncFromServer(updated);
      setShowDetails(false);
      setSuccessNotice('Policy details updated successfully.');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Publishes what is in the editor now, not the last saved config.
  const handlePublishConfirm = async () => {
    if (!policy) return;
    const draft = editorRef.current?.current();
    if (!draft) {
      setShowPublish(false);
      setError('Fix the JSON in the editor before publishing.');
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccessNotice(null);
    try {
      const updated = await updatePolicy(policyId, {
        name: policy.name,
        description: policy.description,
        config: draft.config,
        subOrganizationId: policy.sub_organization_id,
        isDefault: policy.is_default,
        changeNote: draft.changeNote,
      });
      setPolicy(updated);
      resetEditor(updated.config);
      setShowPublish(false);
      setSuccessNotice(`Published revision r${updated.revision}. Devices will sync these rules.`);
    } catch (err) {
      const { errors } = failWith(err);
      if (errors.length) {
        setShowPublish(false);
        editorRef.current?.showErrors(errors);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    if (dirty && !window.confirm(LEAVE_PROMPT)) return;
    router.push('/org-admin/tracking/policies');
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
            onClick={goBack}
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
              {policy.updated_at && <> · updated {formatDate(orgDateOf(policy.updated_at))}</>}
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
              config={editorBase}
              schema={schema}
              isSaving={isSaving}
              readOnly={!canManage || policy.status !== 'active'}
              resetToken={resetToken}
              onSave={handleSaveConfig}
              onDirtyChange={setDirty}
              handleRef={editorRef}
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
