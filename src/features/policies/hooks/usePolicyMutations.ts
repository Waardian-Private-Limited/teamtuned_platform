'use client';

import { useCallback, useRef, useState } from 'react';
import * as policiesApi from '../api/policies.api';
import type { Policy, PolicyFormInput } from '../types/policies.model';
import { ApiError } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { FieldValidationError, asFieldError, messageOf } from '../utils/asyncAction';
import { validatePolicyName, validatePolicyCode } from '../utils/validators';
import type { PolicyFieldName } from '../constants/policies.constants';

export interface FieldError {
  field: PolicyFieldName;
  message: string;
}

export function usePolicyMutations(refetch: () => Promise<void>, onOptimisticStatus?: (id: number, next: Policy['status']) => void) {
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [fieldError, setFieldError] = useState<FieldError | null>(null);
  const [deleteBlockedMessage, setDeleteBlockedMessage] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const run = useCallback(async (action: () => Promise<void>, successMessage?: string) => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    setIsSaving(true);
    setFieldError(null);
    try {
      await action();
      if (successMessage) showSuccess(successMessage);
      return true;
    } catch (err) {
      if (err instanceof FieldValidationError) setFieldError({ field: err.field, message: err.message });
      else showError(messageOf(err));
      return false;
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }, []);

  const createPolicy = useCallback((input: PolicyFormInput) => run(async () => {
    const nameError = validatePolicyName(input.name);
    if (nameError) throw new FieldValidationError('name', nameError);
    const codeError = validatePolicyCode(input.code);
    if (codeError) throw new FieldValidationError('code', codeError);

    await policiesApi
      .createPolicy({ name: input.name.trim(), code: input.code.trim(), description: input.description.trim(), config: input.config, effectiveFrom: input.effectiveFrom })
      .catch((err: unknown) => asFieldError(err, 'code', [409]));

    await refetch();
  }, 'Policy created'), [refetch, run]);

  const clonePolicy = useCallback((id: number, name: string) => run(async () => {
    await policiesApi.clonePolicy(id, name).catch((err: unknown) => asFieldError(err, 'name', [409]));
    await refetch();
  }, 'Policy duplicated'), [refetch, run]);

  const updateStatus = useCallback((policy: Policy, nextStatus: Policy['status']) => run(async () => {
    setTogglingId(policy.id);
    onOptimisticStatus?.(policy.id, nextStatus);
    try {
      await policiesApi.updatePolicyStatus(policy.id, nextStatus);
      await refetch();
    } catch (err) {
      onOptimisticStatus?.(policy.id, policy.status);
      throw err;
    } finally {
      setTogglingId(null);
    }
  }), [refetch, run, onOptimisticStatus]);

  const deletePolicy = useCallback(async (id: number) => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    setIsSaving(true);
    setDeleteBlockedMessage(null);
    try {
      await policiesApi.deletePolicy(id);
      await refetch();
      showSuccess('Policy deleted');
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'POLICY_IN_USE') {
        setDeleteBlockedMessage(messageOf(err));
        return false;
      }
      showError(messageOf(err));
      return false;
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }, [refetch]);

  return {
    isSaving,
    togglingId,
    fieldError,
    clearFieldError: () => setFieldError(null),
    createPolicy,
    clonePolicy,
    updateStatus,
    deletePolicy,
    deleteBlockedMessage,
    clearDeleteBlockedMessage: () => setDeleteBlockedMessage(null),
  };
}
