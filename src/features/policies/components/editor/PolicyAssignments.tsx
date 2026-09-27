'use client';

import React from 'react';
import { Search, Trash2, UserPlus, Users } from 'lucide-react';
import { useScopeTargets } from '../../hooks/useScopeTargets';
import { usePolicyAssignments } from '../../hooks/usePolicyAssignments';
import { useResolveEmployeePolicy } from '../../hooks/useResolveEmployeePolicy';
import { SCOPE_TYPE_OPTIONS } from '../../constants/policies.constants';
import type { PolicyAssignment, ScopeType } from '../../types/policies.model';
import { AssignPolicyDialog } from './AssignPolicyDialog';

interface PolicyAssignmentsProps {
  policyId: number;
  policyName: string;
  canEdit: boolean;
}

function scopeLabel(scopeType: ScopeType) {
  return SCOPE_TYPE_OPTIONS.find((o) => o.value === scopeType)?.label ?? scopeType;
}

/**
 * Who this policy applies to. A policy with no assignment is configured but
 * inert — this panel is the only place in the UI that connects a policy to
 * real employees, so it sits next to the editor rather than behind a
 * separate screen.
 */
export function PolicyAssignments({ policyId, policyName, canEdit }: PolicyAssignmentsProps) {
  const { assignments, isLoading, error, isSaving, assign, unassign } = usePolicyAssignments(policyId);
  const [showAssign, setShowAssign] = React.useState(false);

  return (
    <div className="rounded-xl border border-line bg-surface p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-fg-muted" />
          <h3 className="text-sm font-semibold text-fg">Assigned to</h3>
          <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-1.5 text-[11px] font-semibold text-fg-muted">
            {assignments.length}
          </span>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowAssign(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[11px] font-semibold text-fg transition-colors hover:bg-bg-subtle"
          >
            <UserPlus className="h-3.5 w-3.5" /> Assign
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-xs font-medium text-[var(--tt-danger)]">{error}</p>}

      {isLoading ? (
        <p className="text-xs text-fg-muted">Loading assignments…</p>
      ) : assignments.length === 0 ? (
        <p className="text-[11px] text-fg-muted sm:text-xs">
          Not assigned yet — nobody follows this policy until it is assigned to a scope.
        </p>
      ) : (
        <ul className="space-y-2">
          {assignments.map((a) => (
            <AssignmentRow key={a.id} assignment={a} canEdit={canEdit} isSaving={isSaving} onRemove={() => unassign(a.id)} />
          ))}
        </ul>
      )}

      <ResolveCheck policyId={policyId} />

      <AssignPolicyDialog
        open={showAssign}
        policyName={policyName}
        isSaving={isSaving}
        onClose={() => setShowAssign(false)}
        onConfirm={async (input) => {
          const ok = await assign(input);
          if (ok) setShowAssign(false);
        }}
      />
    </div>
  );
}

function AssignmentRow({
  assignment, canEdit, isSaving, onRemove,
}: {
  assignment: PolicyAssignment;
  canEdit: boolean;
  isSaving: boolean;
  onRemove: () => void;
}) {
  // Resolve the scope id to its name through the same lists the assign
  // dialog picks from, so a row reads "Department · Operations" rather than
  // "department #7".
  const { targets } = useScopeTargets(assignment.scopeType);
  const targetName = assignment.scopeId
    ? targets.find((t) => t.id === assignment.scopeId)?.label ?? `#${assignment.scopeId}`
    : null;

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-line/60 p-2.5">
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold text-fg">
          {scopeLabel(assignment.scopeType)}
          {targetName && <span className="font-normal text-fg-muted"> · {targetName}</span>}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-fg-muted">
          from {assignment.effectiveFrom}
          {assignment.effectiveTo ? ` to ${assignment.effectiveTo}` : ''} · priority {assignment.priority}
        </div>
      </div>
      {canEdit && (
        <button
          type="button"
          disabled={isSaving}
          onClick={onRemove}
          aria-label="Remove assignment"
          className="shrink-0 rounded-md border border-line p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)] disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
}

/**
 * Precedence is easy to get wrong when several scopes overlap, so the panel
 * carries the resolver itself: give it an employee and it says which policy
 * and version that employee lands on today.
 */
function ResolveCheck({ policyId }: { policyId: number }) {
  const { result, isLoading, error, resolve } = useResolveEmployeePolicy();
  const [employeeId, setEmployeeId] = React.useState('');

  const submit = () => {
    const id = Number(employeeId);
    if (!Number.isFinite(id) || id <= 0) return;
    resolve(id);
  };

  const matchesThisPolicy = result?.policyId === policyId;

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Search className="h-3.5 w-3.5 text-fg-muted" />
        <span className="text-[11px] font-semibold text-fg sm:text-xs">Check an employee</span>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={1}
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="Employee id"
          className="h-8 w-full min-w-0 rounded-lg border border-line bg-surface px-2.5 text-[11px] text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] sm:text-xs"
        />
        <button
          type="button"
          disabled={isLoading || !employeeId}
          onClick={submit}
          className="inline-flex h-8 shrink-0 items-center rounded-lg border border-line px-2.5 text-[11px] font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:opacity-40"
        >
          Resolve
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      {result && (
        <p className="mt-1.5 text-[11px] text-fg-muted sm:text-xs">
          On {result.date}, employee {result.employeeId} follows{' '}
          <span className="font-semibold text-fg">
            {matchesThisPolicy ? 'this policy' : `policy #${result.policyId}`} (v{result.versionNo})
          </span>
          {matchesThisPolicy ? '.' : ' — not this one.'}
        </p>
      )}
    </div>
  );
}
