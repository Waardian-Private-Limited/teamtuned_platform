'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, Rocket, SquarePen } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { Alert } from '@/components/ui/Alert';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import { usePermission } from '@/lib/hooks/usePermission';
import { usePoliciesBasePath } from '../../hooks/usePoliciesBasePath';
import { usePolicyDetail } from '../../hooks/usePolicyDetail';
import { POLICY_PERMISSIONS } from '../../constants/policies.constants';
import type { PolicyVersion } from '../../types/policies.model';
import { PolicyConfigEditor } from './PolicyConfigEditor';
import { PolicyVersionHistory } from './PolicyVersionHistory';
import { PolicyVersionDialog } from './PolicyVersionDialog';
import { PolicyImpactDialog } from './PolicyImpactDialog';
import { PolicyAssignments } from './PolicyAssignments';
import { PolicyDetailsDialog } from './PolicyDetailsDialog';
import { PayCalendarDialog } from './PayCalendarDialog';

const secondaryButtonCls =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm';

export function PolicyEditorPage({ policyId }: { policyId: number }) {
  const router = useRouter();
  const basePath = usePoliciesBasePath();
  const { can } = usePermission();
  const canEdit = can(POLICY_PERMISSIONS.EDIT);
  const detail = usePolicyDetail(policyId);

  const [showImpact, setShowImpact] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);
  const [showPayCalendar, setShowPayCalendar] = React.useState(false);
  const [viewVersion, setViewVersion] = React.useState<PolicyVersion | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [effectiveFrom, setEffectiveFrom] = React.useState(today);

  const openPublishFlow = async () => {
    setEffectiveFrom(today);
    setShowImpact(true);
    await detail.loadImpact(today);
  };

  const changeEffectiveFrom = async (date: string) => {
    setEffectiveFrom(date);
    if (date) await detail.loadImpact(date);
  };

  const confirmPublish = async () => {
    const ok = await detail.publishDraft(effectiveFrom || undefined);
    if (ok) setShowImpact(false);
  };

  if (detail.isLoading) {
    return <div className="p-6 text-sm text-fg-muted">Loading policy…</div>;
  }
  if (detail.error || !detail.policy) {
    return (
      <div className="p-4">
        <Alert message={detail.error || 'Policy not found'} tone="error" />
      </div>
    );
  }

  const { policy, versions } = detail;
  const activeConfig = policy.draftVersion?.config ?? policy.currentVersion?.config ?? {};

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(basePath)}
            className="rounded-lg border border-line p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
            aria-label="Back to policies"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg">{policy.name}</h1>
              <SubOrgBadge subOrgId={policy.subOrganizationId} />
              <StatusPill label={policy.status} tone={policy.status === 'active' ? 'active' : 'inactive'} />
            </div>
            <p className="mt-0.5 text-xs text-fg-muted">
              code <code className="rounded bg-bg-subtle px-1 py-0.5">{policy.code}</code>
              {policy.currentVersion && <> · live: v{policy.currentVersion.versionNo}</>}
              {policy.draftVersion && <> · draft: v{policy.draftVersion.versionNo}</>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button type="button" onClick={() => setShowDetails(true)} className={secondaryButtonCls}>
              <SquarePen className="h-3.5 w-3.5" />
              <span>Edit details</span>
            </button>
          )}
          <button type="button" onClick={() => setShowPayCalendar(true)} className={secondaryButtonCls}>
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Pay calendar</span>
          </button>
          {canEdit && policy.draftVersion && (
            <button
              type="button"
              onClick={openPublishFlow}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:text-sm"
            >
              <Rocket className="h-3.5 w-3.5" />
              <span>Publish draft (v{policy.draftVersion.versionNo})</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto tt-scroll-hidden lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-line bg-surface p-3 sm:p-4">
            <PolicyConfigEditor config={activeConfig} isSaving={detail.isSaving} onSave={(config, changeNote) => detail.saveDraft(config, changeNote)} />
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:col-span-1">
          <PolicyAssignments policyId={policyId} policyName={policy.name} canEdit={canEdit} />
          <PolicyVersionHistory
            versions={versions}
            isSaving={detail.isSaving}
            canEdit={canEdit}
            onRollback={detail.rollbackTo}
            onView={setViewVersion}
          />
        </div>
      </div>

      <PolicyImpactDialog
        open={showImpact}
        impact={detail.impact}
        isLoading={detail.isLoadingImpact}
        isPublishing={detail.isSaving}
        effectiveFrom={effectiveFrom}
        onEffectiveFromChange={changeEffectiveFrom}
        changeHandling={(policy.draftVersion?.config as { leave?: { changeHandling?: Record<string, unknown> } } | undefined)?.leave?.changeHandling}
        onClose={() => setShowImpact(false)}
        onConfirm={confirmPublish}
      />

      <PolicyDetailsDialog
        open={showDetails}
        policy={policy}
        isSaving={detail.isSaving}
        onClose={() => setShowDetails(false)}
        onConfirm={async (input) => {
          const ok = await detail.updateDetails(input);
          if (ok) setShowDetails(false);
        }}
      />

      <PayCalendarDialog open={showPayCalendar} policyId={policyId} onClose={() => setShowPayCalendar(false)} />

      <PolicyVersionDialog
        open={Boolean(viewVersion)}
        version={viewVersion}
        compareTo={policy.currentVersion}
        onClose={() => setViewVersion(null)}
      />
    </div>
  );
}
