'use client';

import { useCallback, useState } from 'react';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/salaryAdvance.api';
import { toHrAdvanceBody, toMyAdvanceBody } from '../types/salaryAdvance.mapper';
import type {
  HrAdvanceFieldErrors,
  HrAdvanceFieldName,
  HrAdvanceFormInput,
  MyAdvanceFieldErrors,
  MyAdvanceFieldName,
  MyAdvanceFormInput,
} from '../types/salaryAdvance.model';
import { routeError } from '../utils/errors';

const HR_FIELDS: HrAdvanceFieldName[] = ['employee_id', 'advance_type_id', 'amount', 'installments', 'reason', 'start_month', 'merge_advance_ids'];
const MY_FIELDS: MyAdvanceFieldName[] = ['advance_type_id', 'amount', 'installments', 'reason', 'attachments', 'start_month'];

function successText(status: string, mine: boolean) {
  if (status === 'pending') return mine ? 'Request sent for approval' : 'Advance created and sent for approval';
  if (status === 'approved') return mine ? 'Request approved' : 'Advance created and approved';
  return mine ? 'Request sent' : 'Advance created';
}

export function useCreateHrAdvance(onCreated: (id: number) => void) {
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<HrAdvanceFieldErrors>({});
  const [formError, setFormError] = useState('');

  const clear = useCallback(() => {
    setFieldErrors({});
    setFormError('');
  }, []);

  const create = useCallback(
    async (input: HrAdvanceFormInput) => {
      setIsSaving(true);
      clear();
      try {
        const res = await api.createAdvance(toHrAdvanceBody(input));
        showSuccess(successText(res.status, false));
        onCreated(res.id);
        return true;
      } catch (err) {
        routeError(err, HR_FIELDS, setFieldErrors, setFormError);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [clear, onCreated]
  );

  return { isSaving, fieldErrors, setFieldErrors, formError, clear, create };
}

export function useCreateMyAdvance(onCreated: () => void) {
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<MyAdvanceFieldErrors>({});
  const [formError, setFormError] = useState('');

  const clear = useCallback(() => {
    setFieldErrors({});
    setFormError('');
  }, []);

  const create = useCallback(
    async (input: MyAdvanceFormInput) => {
      setIsSaving(true);
      clear();
      try {
        const res = await api.createMyAdvance(toMyAdvanceBody(input));
        showSuccess(successText(res.status, true));
        onCreated();
        return true;
      } catch (err) {
        routeError(err, MY_FIELDS, setFieldErrors, setFormError);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [clear, onCreated]
  );

  return { isSaving, fieldErrors, setFieldErrors, formError, clear, create };
}
