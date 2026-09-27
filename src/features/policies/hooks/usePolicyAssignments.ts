'use client';

import { useCallback, useEffect, useState } from 'react';
import * as policiesApi from '../api/policies.api';
import { toPolicyAssignments } from '../types/policies.mapper';
import type { PolicyAssignment, ScopeType } from '../types/policies.model';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';

export interface AssignInput {
  scopeType: ScopeType;
  scopeId: number | null;
  priority: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

/**
 * The assignments of ONE policy. The backend lists every assignment in the
 * org (optionally narrowed by scope type), so the policy filter is applied
 * here — assignment rows are few enough per org that a second endpoint
 * would buy nothing.
 */
export function usePolicyAssignments(policyId: number) {
  const [assignments, setAssignments] = useState<PolicyAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const dto = await policiesApi.listAssignments();
      setAssignments(toPolicyAssignments(dto.assignments).filter((a) => a.policyId === policyId));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [policyId]);

  useEffect(() => {
    load();
  }, [load]);

  const assign = useCallback(async (input: AssignInput) => {
    setIsSaving(true);
    try {
      await policiesApi.assignPolicy({
        policyId,
        scopeType: input.scopeType,
        scopeId: input.scopeType === 'organization' ? null : input.scopeId,
        priority: input.priority,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
      });
      await load();
      showSuccess('Policy assigned');
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [policyId, load]);

  const unassign = useCallback(async (id: number) => {
    setIsSaving(true);
    try {
      await policiesApi.unassignPolicy(id);
      await load();
      showSuccess('Assignment removed');
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  return { assignments, isLoading, error, isSaving, refetch: load, assign, unassign };
}
