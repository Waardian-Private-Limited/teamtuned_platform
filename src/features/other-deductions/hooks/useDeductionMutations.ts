'use client';

import { useCallback, useState } from 'react';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/otherDeductions.api';
import { toCreateDeductionBody } from '../types/otherDeductions.mapper';
import type { DeductionFieldErrors, DeductionFieldName, DeductionFormInput } from '../types/otherDeductions.model';

const FIELD_NAMES: DeductionFieldName[] = ['employee_ids', 'title', 'amount_value', 'payout_month', 'installments', 'notes'];

function fieldOf(err: unknown): DeductionFieldName | null {
  const field = err instanceof ApiError ? (err.data as { field?: string } | null)?.field : undefined;
  return field && (FIELD_NAMES as string[]).includes(field) ? (field as DeductionFieldName) : null;
}

export function useDeductionMutations(onChanged: () => void, onCancelledLocally: (ids: number[]) => void) {
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<DeductionFieldErrors>({});
  const [formError, setFormError] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const clearFormErrors = useCallback(() => {
    setFieldErrors({});
    setFormError('');
  }, []);

  const create = useCallback(
    async (input: DeductionFormInput) => {
      setIsSaving(true);
      clearFormErrors();
      try {
        const res = await api.createDeductions(toCreateDeductionBody(input));
        const skipped = res.skipped?.length ?? 0;
        showSuccess(
          `Deduction added for ${res.employees} employee${res.employees === 1 ? '' : 's'}${skipped ? `, ${skipped} skipped` : ''}${res.status === 'pending' ? ' · waiting for approval' : res.status === 'approved' ? ' · scheduled for payroll' : ''}`
        );
        onChanged();
        return true;
      } catch (err) {
        const field = fieldOf(err);
        if (field) setFieldErrors({ [field]: messageOf(err) });
        else setFormError(messageOf(err));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [clearFormErrors, onChanged]
  );

  const cancel = useCallback(
    async (ids: number[]) => {
      setIsCancelling(true);
      setCancelError('');
      try {
        const res = await api.cancelDeductions(ids);
        if (res.cancelled) {
          onCancelledLocally(ids);
          showSuccess('Deduction cancelled');
          return true;
        }
        setCancelError('This deduction is already part of a finalized payroll and can no longer be cancelled.');
        return false;
      } catch (err) {
        setCancelError(messageOf(err));
        return false;
      } finally {
        setIsCancelling(false);
      }
    },
    [onCancelledLocally]
  );

  return {
    isSaving,
    fieldErrors,
    setFieldErrors,
    formError,
    clearFormErrors,
    create,
    isCancelling,
    cancelError,
    clearCancelError: () => setCancelError(''),
    cancel,
  };
}
