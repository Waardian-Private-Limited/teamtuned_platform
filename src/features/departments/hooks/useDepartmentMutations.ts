'use client';

import { useCallback, useRef, useState } from 'react';
import * as departmentsApi from '../api/departments.api';
import type { Department, DepartmentFormInput } from '../types/departments.model';
import { ApiError } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { FieldValidationError, asFieldError, messageOf } from '../utils/asyncAction';
import { validateDepartmentName } from '../utils/validators';
import type { DepartmentFieldName } from '../constants/departments.constants';

export interface FieldError {
  field: DepartmentFieldName;
  message: string;
}

export function useDepartmentMutations(
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

  const createDepartment = useCallback((input: DepartmentFormInput) => run(async () => {
    const nameError = validateDepartmentName(input.name);
    if (nameError) throw new FieldValidationError('name', nameError);

    await departmentsApi
      .createDepartment({ name: input.name.trim(), description: input.description.trim(), status: input.status })
      .catch((err: unknown) => asFieldError(err, 'name', [409]));

    await refetch();
  }, 'Department created'), [refetch, run]);

  const updateDepartment = useCallback((id: number, input: DepartmentFormInput) => run(async () => {
    const nameError = validateDepartmentName(input.name);
    if (nameError) throw new FieldValidationError('name', nameError);

    await departmentsApi
      .updateDepartment(id, { name: input.name.trim(), description: input.description.trim(), status: input.status })
      .catch((err: unknown) => asFieldError(err, 'name', [409]));

    await refetch();
  }, 'Department updated'), [refetch, run]);

  const toggleStatus = useCallback((department: Department) => run(async () => {
    const next = department.status === 'active' ? 'inactive' : 'active';
    setTogglingId(department.id);
    onOptimisticToggle?.(department.id, next);
    try {
      await departmentsApi.updateDepartmentStatus(department.id, next);
      await refetch();
    } catch (err) {
      onOptimisticToggle?.(department.id, department.status);
      throw err;
    } finally {
      setTogglingId(null);
    }
  }), [refetch, run, onOptimisticToggle]);

  // Deliberately not built on `run`: a blocked delete renders inline in the
  // confirmation dialog (with the server's counts), not as a toast, so its
  // error handling branches before anything generic would show one.
  const deleteDepartment = useCallback(async (id: number) => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    setIsSaving(true);
    setDeleteBlockedMessage(null);
    try {
      await departmentsApi.deleteDepartment(id);
      await refetch();
      showSuccess('Department deleted');
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DEPARTMENT_IN_USE') {
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
    createDepartment,
    updateDepartment,
    toggleStatus,
    deleteDepartment,
    deleteBlockedMessage,
    clearDeleteBlockedMessage: () => setDeleteBlockedMessage(null),
  };
}
