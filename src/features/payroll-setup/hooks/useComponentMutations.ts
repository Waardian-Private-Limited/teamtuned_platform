'use client';

import { useCallback, useRef, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import { showError, showSuccess } from '@/lib/toast';
import { asComponentFieldError, ComponentFieldValidationError, messageOf } from '../utils/asyncAction';
import { validateComponentName } from '../utils/validators';
import type { ComponentFieldName } from '../constants/payroll-setup.constants';
import type { ComponentFormInput } from '../types/payroll-setup.model';

export interface FieldError {
  field: ComponentFieldName;
  message: string;
}

export function useComponentMutations(refetch: () => Promise<void>) {
  const [isSaving, setIsSaving] = useState(false);
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
      if (err instanceof ComponentFieldValidationError) setFieldError({ field: err.field, message: err.message });
      else showError(messageOf(err));
      return false;
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }, []);

  const createComponent = useCallback((input: ComponentFormInput) => run(async () => {
    const nameError = validateComponentName(input.name);
    if (nameError) throw new ComponentFieldValidationError('component_name', nameError);
    await api.createComponent(input).catch((err: unknown) => asComponentFieldError(err, 'component_name', [409]));
    await refetch();
  }, 'Component created'), [refetch, run]);

  const updateComponent = useCallback((id: number, input: ComponentFormInput) => run(async () => {
    const nameError = validateComponentName(input.name);
    if (nameError) throw new ComponentFieldValidationError('component_name', nameError);
    await api.updateComponent(id, input).catch((err: unknown) => asComponentFieldError(err, 'component_name', [409]));
    await refetch();
  }, 'Component updated'), [refetch, run]);

  const deleteComponent = useCallback(async (id: number) => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    setIsSaving(true);
    setDeleteBlockedMessage(null);
    try {
      await api.deleteComponent(id);
      await refetch();
      showSuccess('Component deleted');
      return true;
    } catch (err) {
      const msg = messageOf(err);
      if ((err as { code?: string })?.code === 'SALARY_COMPONENT_IN_USE') {
        setDeleteBlockedMessage(msg);
        return false;
      }
      showError(msg);
      return false;
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }, [refetch]);

  const reorderComponents = useCallback((orderedIds: number[]) => run(async () => {
    await api.reorderComponents(orderedIds);
    await refetch();
  }, 'Salary components sequence updated'), [refetch, run]);

  return {
    isSaving,
    fieldError,
    clearFieldError: () => setFieldError(null),
    deleteBlockedMessage,
    clearDeleteBlockedMessage: () => setDeleteBlockedMessage(null),
    createComponent,
    updateComponent,
    reorderComponents,
    deleteComponent,
  };
}
