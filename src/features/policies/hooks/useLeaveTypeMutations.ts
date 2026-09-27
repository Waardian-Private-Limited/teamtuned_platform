'use client';

import { useCallback, useRef, useState } from 'react';
import * as policiesApi from '../api/policies.api';
import type { LeaveTypeFormInput } from '../types/policies.model';
import { showError, showSuccess } from '@/lib/toast';
import { FieldValidationError, asFieldError, messageOf } from '../utils/asyncAction';
import { validateLeaveTypeName } from '../utils/validators';

export function useLeaveTypeMutations(refetch: () => Promise<void>) {
  const [isSaving, setIsSaving] = useState(false);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
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

  const createLeaveType = useCallback((input: LeaveTypeFormInput) => run(async () => {
    const nameError = validateLeaveTypeName(input.name);
    if (nameError) throw new FieldValidationError('name', nameError);
    await policiesApi
      .createLeaveType({ name: input.name.trim(), code: input.code.trim(), category: input.category, unit: input.unit, isPaid: input.isPaid, requiresApproval: input.requiresApproval, allowHalfDay: input.allowHalfDay, status: input.status })
      .catch((err: unknown) => asFieldError(err, 'name', [409]));
    await refetch();
  }, 'Leave type created'), [refetch, run]);

  const updateLeaveType = useCallback((id: number, input: Partial<LeaveTypeFormInput>) => run(async () => {
    await policiesApi.updateLeaveType(id, input);
    await refetch();
  }, 'Leave type updated'), [refetch, run]);

  const deleteLeaveType = useCallback((id: number) => run(async () => {
    await policiesApi.deleteLeaveType(id);
    await refetch();
  }, 'Leave type deleted'), [refetch, run]);

  const seedCatalog = useCallback(() => run(async () => {
    await policiesApi.seedLeaveTypeCatalog();
    await refetch();
  }, 'Global leave type catalogue applied'), [refetch, run]);

  return { isSaving, fieldError, clearFieldError: () => setFieldError(null), createLeaveType, updateLeaveType, deleteLeaveType, seedCatalog };
}
