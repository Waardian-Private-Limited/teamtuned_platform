'use client';

import { useCallback, useRef, useState } from 'react';
import * as shiftTemplatesApi from '../api/shiftTemplates.api';
import type { ShiftTemplate, ShiftTemplateFormInput, ShiftTemplateStatus } from '../types/shiftTemplates.model';
import { showError, showSuccess } from '@/lib/toast';
import { FieldValidationError, asFieldError, messageOf } from '../utils/asyncAction';
import { validateShiftInput } from '../utils/shiftTime';
import type { ShiftFieldName } from '../constants/shiftTemplates.constants';

export interface FieldError {
  field: ShiftFieldName;
  message: string;
}

function normalize(input: ShiftTemplateFormInput): ShiftTemplateFormInput {
  return { ...input, name: input.name.trim() };
}

export function useShiftTemplateMutations(
  refetch: () => Promise<void>,
  onOptimisticToggle?: (id: number, nextStatus: ShiftTemplateStatus) => void
) {
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [fieldError, setFieldError] = useState<FieldError | null>(null);
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

  const save = useCallback(
    (id: number | null, input: ShiftTemplateFormInput) =>
      run(async () => {
        const clean = normalize(input);
        const invalid = validateShiftInput(clean);
        if (invalid) throw new FieldValidationError(invalid.field, invalid.message);

        const request = id === null
          ? shiftTemplatesApi.createShiftTemplate(clean)
          : shiftTemplatesApi.updateShiftTemplate(id, clean);
        // 409 is the duplicate-name conflict; it belongs on the name field.
        await request.catch((err: unknown) => asFieldError(err, 'name', [409]));
        await refetch();
      }, id === null ? 'Shift created' : 'Shift updated'),
    [refetch, run]
  );

  const toggleStatus = useCallback((shift: ShiftTemplate) => run(async () => {
    const next = shift.status === 'active' ? 'inactive' : 'active';
    setTogglingId(shift.id);
    onOptimisticToggle?.(shift.id, next);
    try {
      await shiftTemplatesApi.updateShiftTemplateStatus(shift.id, next);
      await refetch();
    } catch (err) {
      onOptimisticToggle?.(shift.id, shift.status);
      throw err;
    } finally {
      setTogglingId(null);
    }
  }), [refetch, run, onOptimisticToggle]);

  const deleteShift = useCallback((id: number) => run(async () => {
    await shiftTemplatesApi.deleteShiftTemplate(id);
    await refetch();
  }, 'Shift deleted'), [refetch, run]);

  return {
    isSaving,
    togglingId,
    fieldError,
    clearFieldError: () => setFieldError(null),
    createShift: (input: ShiftTemplateFormInput) => save(null, input),
    updateShift: (id: number, input: ShiftTemplateFormInput) => save(id, input),
    toggleStatus,
    deleteShift,
  };
}
