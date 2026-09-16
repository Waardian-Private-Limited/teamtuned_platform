'use client';

import { useCallback, useRef, useState } from 'react';
import * as rolesApi from '../api/roles.api';
import type { Role, RoleFormInput } from '../types/roles.model';
import { ApiError } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { FieldValidationError, asFieldError, messageOf } from '../utils/asyncAction';
import { validateRoleName } from '../utils/validators';
import type { RoleFieldName } from '../constants/roles.constants';

export interface FieldError {
  field: RoleFieldName;
  message: string;
}

export function useRoleMutations(
  refetch: () => Promise<void>,
  onOptimisticToggle?: (id: number, nextStatus: 'active' | 'inactive') => void
) {
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

  const createRole = useCallback((input: RoleFormInput) => run(async () => {
    const nameError = validateRoleName(input.name);
    if (nameError) throw new FieldValidationError('name', nameError);

    await rolesApi
      .createRole({ name: input.name.trim(), departmentId: input.departmentId, description: input.description.trim(), status: input.status, permissions: input.permissions })
      .catch((err: unknown) => asFieldError(err, 'name', [409]));

    await refetch();
  }, 'Role created'), [refetch, run]);

  const updateRole = useCallback((id: number, input: RoleFormInput) => run(async () => {
    const nameError = validateRoleName(input.name);
    if (nameError) throw new FieldValidationError('name', nameError);

    await rolesApi
      .updateRole(id, { name: input.name.trim(), departmentId: input.departmentId, description: input.description.trim(), status: input.status, permissions: input.permissions })
      .catch((err: unknown) => asFieldError(err, 'name', [409]));

    await refetch();
  }, 'Role updated'), [refetch, run]);

  const toggleStatus = useCallback((role: Role) => run(async () => {
    const next = role.status === 'active' ? 'inactive' : 'active';
    setTogglingId(role.id);
    onOptimisticToggle?.(role.id, next);
    try {
      await rolesApi.updateRoleStatus(role.id, next);
      await refetch();
    } catch (err) {
      onOptimisticToggle?.(role.id, role.status);
      throw err;
    } finally {
      setTogglingId(null);
    }
  }), [refetch, run, onOptimisticToggle]);

  const cloneRole = useCallback((role: Role, name?: string) => run(async () => {
    await rolesApi.cloneRole(role.id, name);
    await refetch();
  }, 'Role duplicated'), [refetch, run]);

  // Deliberately not built on `run`: a blocked delete (ROLE_IN_USE /
  // ROLE_IS_SYSTEM) renders inline in the confirmation dialog, not as a toast.
  const deleteRole = useCallback(async (id: number) => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    setIsSaving(true);
    setDeleteBlockedMessage(null);
    try {
      await rolesApi.deleteRole(id);
      await refetch();
      showSuccess('Role deleted');
      return true;
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'ROLE_IN_USE' || err.code === 'ROLE_IS_SYSTEM')) {
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
    createRole,
    updateRole,
    toggleStatus,
    cloneRole,
    deleteRole,
    deleteBlockedMessage,
    clearDeleteBlockedMessage: () => setDeleteBlockedMessage(null),
  };
}
