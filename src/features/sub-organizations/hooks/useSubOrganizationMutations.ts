'use client';

import { useCallback, useRef, useState } from 'react';
import * as api from '../api/subOrganizations.api';
import { showError, showSuccess } from '@/lib/toast';
import { ApiError } from '@/lib/api/errors';
import { FieldValidationError, asFieldError, messageOf } from '../utils/asyncAction';
import { validateCode, validateGstNumber, validateName } from '../utils/validators';
import type { SubOrgFieldName } from '../constants/sub-organizations.constants';
import type { SubOrganization, SubOrganizationFormInput } from '../types/sub-organizations.model';

export interface SubOrgFieldError {
  field: SubOrgFieldName;
  message: string;
}

export function useSubOrganizationMutations(
  refetch: () => Promise<void>,
  onOptimisticToggle?: (id: number, status: SubOrganization['status']) => void
) {
  const [isSaving, setIsSaving] = useState(false);
  const [settingPrimaryId, setSettingPrimaryId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [fieldError, setFieldError] = useState<SubOrgFieldError | null>(null);
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

  const validate = (input: SubOrganizationFormInput) => {
    const nameError = validateName(input.name);
    if (nameError) throw new FieldValidationError('name', nameError);
    const codeError = validateCode(input.code);
    if (codeError) throw new FieldValidationError('code', codeError);
    const gstError = validateGstNumber(input.gstNumber);
    if (gstError) throw new FieldValidationError('gst_number', gstError);
  };

  const createSubOrganization = useCallback((input: SubOrganizationFormInput) => run(async () => {
    validate(input);
    await api.createSubOrganization(input).catch((err: unknown) => asFieldError(err, 'code', [409]));
    await refetch();
  }, 'Sub-organization created'), [refetch, run]);

  const updateSubOrganization = useCallback((id: number, input: SubOrganizationFormInput) => run(async () => {
    validate(input);
    await api.updateSubOrganization(id, input).catch((err: unknown) => asFieldError(err, 'code', [409]));
    await refetch();
  }, 'Sub-organization updated'), [refetch, run]);

  const toggleStatus = useCallback((subOrg: SubOrganization) => run(async () => {
    const next = subOrg.status === 'active' ? 'inactive' : 'active';
    setTogglingId(subOrg.id);
    onOptimisticToggle?.(subOrg.id, next);
    try {
      await api.updateSubOrganizationStatus(subOrg.id, next);
      await refetch();
    } catch (err) {
      onOptimisticToggle?.(subOrg.id, subOrg.status);
      throw err;
    } finally {
      setTogglingId(null);
    }
  }), [refetch, run, onOptimisticToggle]);

  const setPrimary = useCallback(async (subOrg: SubOrganization) => {
    setSettingPrimaryId(subOrg.id);
    try {
      await api.setPrimarySubOrganization(subOrg.id);
      await refetch();
      showSuccess(`${subOrg.name} is now the primary entity`);
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setSettingPrimaryId(null);
    }
  }, [refetch]);

  const deleteSubOrganization = useCallback(async (subOrg: SubOrganization) => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    setIsSaving(true);
    setDeleteBlockedMessage(null);
    try {
      await api.deleteSubOrganization(subOrg.id);
      await refetch();
      showSuccess('Sub-organization deactivated');
      return true;
    } catch (err) {
      const message = messageOf(err);
      if (err instanceof ApiError && err.code === 'SUB_ORG_IN_USE') {
        setDeleteBlockedMessage(message);
        return false;
      }
      showError(message);
      return false;
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }, [refetch]);

  return {
    isSaving,
    settingPrimaryId,
    togglingId,
    fieldError,
    clearFieldError: () => setFieldError(null),
    deleteBlockedMessage,
    clearDeleteBlockedMessage: () => setDeleteBlockedMessage(null),
    createSubOrganization,
    updateSubOrganization,
    toggleStatus,
    setPrimary,
    deleteSubOrganization,
  };
}
