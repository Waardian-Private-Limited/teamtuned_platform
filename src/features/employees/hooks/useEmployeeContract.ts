'use client';

import { useCallback, useEffect, useState } from 'react';
import * as employeesApi from '../api/employees.api';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import type { ContractRenewalDto, ContractTermDto } from '../types/employees.dto';

export type RenewField = 'end_date' | 'months';

/** Contract term history of one employee, and renewing the current term. */
export function useEmployeeContract(employeeId: number, enabled: boolean) {
  const [terms, setTerms] = useState<ContractTermDto[] | null>(null);
  const [error, setError] = useState('');
  const [renewing, setRenewing] = useState(false);
  const [renewErrors, setRenewErrors] = useState<Partial<Record<RenewField | 'form', string>>>({});

  const load = useCallback(() => {
    if (!enabled) return;
    setError('');
    employeesApi.getContractHistory(employeeId)
      .then((d) => setTerms(d.terms || []))
      .catch((e) => setError(messageOf(e)));
  }, [employeeId, enabled]);
  useEffect(load, [load]);

  /** Resolves with the new term, or null when refused (the reason lands on its field). */
  const renew = useCallback(async (body: { end_date?: string; months?: number; reason?: string }): Promise<ContractRenewalDto | null> => {
    setRenewing(true);
    setRenewErrors({});
    try {
      const result = await employeesApi.renewContract(employeeId, body);
      showSuccess('Contract renewed');
      load();
      return result;
    } catch (err) {
      const field = err instanceof ApiError ? (err.data as { field?: string } | null)?.field : undefined;
      setRenewErrors({ [field === 'end_date' || field === 'months' ? field : 'form']: messageOf(err) });
      return null;
    } finally {
      setRenewing(false);
    }
  }, [employeeId, load]);

  const clearRenewErrors = useCallback(() => setRenewErrors({}), []);

  return { terms, error, renew, renewing, renewErrors, clearRenewErrors };
}
