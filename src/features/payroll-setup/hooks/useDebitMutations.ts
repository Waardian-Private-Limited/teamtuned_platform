'use client';

import { useCallback, useRef, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import { showError, showSuccess } from '@/lib/toast';
import { asDebitFieldError, DebitFieldValidationError, messageOf } from '../utils/asyncAction';
import { validateDebitForm } from '../utils/validators';
import type { DebitFieldName } from '../constants/payroll-setup.constants';
import type { DebitFormInput, DebitRule } from '../types/payroll-setup.model';

export interface DebitFieldError {
  field: DebitFieldName;
  message: string;
}

export function useDebitMutations(refetch: () => Promise<void>) {
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [fieldError, setFieldError] = useState<DebitFieldError | null>(null);
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
      if (err instanceof DebitFieldValidationError) setFieldError({ field: err.field, message: err.message });
      else showError(messageOf(err));
      return false;
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }, []);

  const createRule = useCallback((input: DebitFormInput) => run(async () => {
    const validation = validateDebitForm(input);
    if (validation) throw new DebitFieldValidationError(validation.field as DebitFieldName, validation.message);
    await api.createDebitRule(input).catch((err: unknown) => asDebitFieldError(err, 'debit_name', [409]));
    await refetch();
  }, 'Deduction rule created'), [refetch, run]);

  const updateRule = useCallback((id: number, input: DebitFormInput) => run(async () => {
    const validation = validateDebitForm(input);
    if (validation) throw new DebitFieldValidationError(validation.field as DebitFieldName, validation.message);
    await api.updateDebitRule(id, input).catch((err: unknown) => asDebitFieldError(err, 'debit_name', [409]));
    await refetch();
  }, 'Deduction rule updated'), [refetch, run]);

  const toggleStatus = useCallback((rule: DebitRule) => run(async () => {
    const next = rule.status === 'active' ? 'inactive' : 'active';
    setTogglingId(rule.id);
    try {
      await api.updateDebitRuleStatus(rule.id, next);
      await refetch();
    } finally {
      setTogglingId(null);
    }
  }), [refetch, run]);

  const deleteRule = useCallback(async (rule: DebitRule) => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    setIsSaving(true);
    setDeleteBlockedMessage(null);
    try {
      await api.deleteDebitRule(rule.id);
      await refetch();
      showSuccess('Deduction rule deleted');
      return true;
    } catch (err) {
      const msg = messageOf(err);
      if ((err as { code?: string })?.code === 'DEBIT_RULE_IN_USE') {
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

  return {
    isSaving,
    togglingId,
    fieldError,
    clearFieldError: () => setFieldError(null),
    deleteBlockedMessage,
    clearDeleteBlockedMessage: () => setDeleteBlockedMessage(null),
    createRule,
    updateRule,
    toggleStatus,
    deleteRule,
  };
}
