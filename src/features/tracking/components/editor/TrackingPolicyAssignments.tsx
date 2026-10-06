'use client';

import React from 'react';
import { Search, Trash2, UserPlus, Users } from 'lucide-react';
import { listTrackedEmployees, setTracking } from '../../api/tracking.api';
import type { TrackedEmployeeDto } from '../../types/tracking.dto';
import { TrackingAssignPolicyDialog } from './TrackingAssignPolicyDialog';

interface TrackingPolicyAssignmentsProps {
  policyId: number;
  policyName: string;
  isDefault: boolean;
  canEdit: boolean;
  onRefresh?: () => void;
}

export function TrackingPolicyAssignments({
  policyId,
  policyName,
  isDefault,
  canEdit,
  onRefresh,
}: TrackingPolicyAssignmentsProps) {
  const [assigned, setAssigned] = React.useState<TrackedEmployeeDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showAssign, setShowAssign] = React.useState(false);

  // Check an employee resolver state
  const [checkQuery, setCheckQuery] = React.useState('');
  const [checkResult, setCheckResult] = React.useState<TrackedEmployeeDto | null>(null);
  const [isChecking, setIsChecking] = React.useState(false);
  const [checkError, setCheckError] = React.useState<string | null>(null);

  const loadAssignments = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listTrackedEmployees({
        filters: { policyId },
        page: 1,
        pageSize: 100,
      });
      setAssigned(res.employees);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assigned employees');
    } finally {
      setIsLoading(false);
    }
  }, [policyId]);

  React.useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const handleUnassign = async (empId: number) => {
    setIsSaving(true);
    try {
      await setTracking({
        employeeIds: [empId],
        enabled: true,
        policyId: null, // resets to default policy
      });
      await loadAssignments();
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unassign employee');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheck = async () => {
    const q = checkQuery.trim();
    if (!q) return;
    setIsChecking(true);
    setCheckError(null);
    setCheckResult(null);
    try {
      const res = await listTrackedEmployees({
        filters: {},
        search: q,
        page: 1,
        pageSize: 5,
      });
      if (res.employees.length > 0) {
        setCheckResult(res.employees[0]);
      } else {
        setCheckError('No employee found matching query');
      }
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-fg-muted" />
          <h3 className="text-sm font-semibold text-fg">Assigned to</h3>
          <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-1.5 text-[11px] font-semibold text-fg-muted">
            {assigned.length}
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
      ) : assigned.length === 0 ? (
        <p className="text-[11px] text-fg-muted sm:text-xs">
          {isDefault
            ? 'No specific direct assignments — all unassigned employees follow this as their default tracking policy.'
            : 'Not assigned directly yet — employees follow the default policy until assigned here.'}
        </p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {assigned.map((a) => (
            <li
              key={a.employee_id}
              className="flex items-center justify-between gap-3 rounded-lg border border-line/60 p-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-fg">{a.name}</p>
                <p className="mt-0.5 truncate text-[11px] text-fg-muted">
                  {a.employee_code ? `ID: ${a.employee_code}` : 'No code'} · {a.enabled ? 'tracking enabled' : 'paused'}
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleUnassign(a.employee_id)}
                  aria-label="Remove assignment"
                  className="shrink-0 rounded-md border border-line p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)] disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Resolve / Check an Employee */}
      <div className="mt-3 border-t border-line pt-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Search className="h-3.5 w-3.5 text-fg-muted" />
          <span className="text-[11px] font-semibold text-fg sm:text-xs">Check an employee</span>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={checkQuery}
            onChange={(e) => setCheckQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCheck();
            }}
            placeholder="Employee name or code"
            className="h-8 w-full min-w-0 rounded-lg border border-line bg-surface px-2.5 text-[11px] text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] sm:text-xs"
          />
          <button
            type="button"
            disabled={isChecking || !checkQuery.trim()}
            onClick={() => void handleCheck()}
            className="inline-flex h-8 shrink-0 items-center rounded-lg border border-line px-2.5 text-[11px] font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:opacity-40"
          >
            Resolve
          </button>
        </div>
        {checkError && <p className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{checkError}</p>}
        {checkResult && (
          <p className="mt-1.5 text-[11px] text-fg-muted sm:text-xs">
            Employee <span className="font-semibold text-fg">{checkResult.name}</span> follows{' '}
            <span className="font-semibold text-fg">
              {checkResult.policy_id === policyId
                ? 'this policy'
                : checkResult.policy_name
                ? checkResult.policy_name
                : 'default tracking policy'}
            </span>
            {checkResult.policy_id === policyId ? '.' : ' — not this one.'}
          </p>
        )}
      </div>

      <TrackingAssignPolicyDialog
        open={showAssign}
        policyId={policyId}
        policyName={policyName}
        isSaving={isSaving}
        onClose={() => setShowAssign(false)}
        onSuccess={() => {
          void loadAssignments();
          onRefresh?.();
        }}
      />
    </div>
  );
}
