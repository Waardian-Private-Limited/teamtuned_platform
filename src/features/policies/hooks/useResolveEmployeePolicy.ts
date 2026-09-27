'use client';

import { useCallback, useState } from 'react';
import * as policiesApi from '../api/policies.api';
import { messageOf } from '@/lib/api/errors';

export interface ResolvedPolicySummary {
  employeeId: number;
  date: string;
  policyId: number;
  versionId: number;
  versionNo: number;
}

/**
 * "Which policy does this employee actually get?" — answered by the same
 * resolver payroll and attendance use, so an admin can confirm a scope
 * assignment does what they expect instead of reasoning about precedence
 * by hand.
 */
export function useResolveEmployeePolicy() {
  const [result, setResult] = useState<ResolvedPolicySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const resolve = useCallback(async (employeeId: number, date?: string) => {
    setIsLoading(true);
    setError('');
    setResult(null);
    try {
      const dto = await policiesApi.resolveEmployeePolicies(employeeId, date);
      setResult({
        employeeId: dto.employee_id,
        date: dto.date,
        policyId: dto.policy?.policyId,
        versionId: dto.policy?.versionId,
        versionNo: dto.policy?.versionNo,
      });
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError('');
  }, []);

  return { result, isLoading, error, resolve, clear };
}
