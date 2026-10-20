'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import { toAssignments } from '../types/payroll-setup.mapper';
import type { AssignedEmployee } from '../types/payroll-setup.model';
import { messageOf, serverFieldOf } from '../utils/asyncAction';
import { showError, showSuccess } from '@/lib/toast';

export function useDebitAssignments(ruleId: number | null, refetchList: () => Promise<void>) {
  const [employees, setEmployees] = useState<AssignedEmployee[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [candidates, setCandidates] = useState<Array<{ id: number; name: string; designation: string | null; email: string | null }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  // Date problems belong under the date input, not in a toast.
  const [dateErrors, setDateErrors] = useState<{ effectiveFrom?: string; effectiveTo?: string }>({});
  const searchSeqRef = useRef(0);

  const failed = useCallback((err: unknown) => {
    const field = serverFieldOf(err, ['effective_from', 'effective_to'] as const);
    if (field === 'effective_from') setDateErrors({ effectiveFrom: messageOf(err) });
    else if (field === 'effective_to') setDateErrors({ effectiveTo: messageOf(err) });
    else showError(messageOf(err));
    return false;
  }, []);

  const fetchAssignments = useCallback(async () => {
    if (!ruleId) return;
    setIsLoading(true);
    setError('');
    try {
      const dto = await api.listRuleAssignments(ruleId, 1, 100);
      const result = toAssignments(dto);
      setEmployees(result.employees);
      setTotal(result.total);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [ruleId]);

  useEffect(() => {
    if (ruleId) fetchAssignments();
    else {
      setEmployees([]);
      setTotal(0);
      setCandidates([]);
    }
  }, [ruleId, fetchAssignments]);

  const searchCandidates = useCallback(async (term: string) => {
    const seq = ++searchSeqRef.current;
    setIsSearching(true);
    try {
      const dto = await api.searchEmployees(term);
      if (searchSeqRef.current === seq) setCandidates(dto.employees || []);
    } catch {
      if (searchSeqRef.current === seq) setCandidates([]);
    } finally {
      if (searchSeqRef.current === seq) setIsSearching(false);
    }
  }, []);

  // effectiveFrom blank = starts after the employee's last finalized payroll.
  const assign = useCallback(async (employeeId: number, effectiveFrom?: string) => {
    if (!ruleId || isAssigning) return false;
    setIsAssigning(true);
    setDateErrors({});
    try {
      await api.assignDebit(ruleId, employeeId, effectiveFrom);
      await Promise.all([fetchAssignments(), refetchList()]);
      showSuccess('Employee assigned');
      return true;
    } catch (err) {
      return failed(err);
    } finally {
      setIsAssigning(false);
    }
  }, [ruleId, isAssigning, fetchAssignments, refetchList, failed]);

  // effectiveTo is the last day the deduction applies; blank = ends with the last finalized payroll.
  const remove = useCallback(async (employeeId: number, effectiveTo?: string) => {
    if (!ruleId || isAssigning) return false;
    setIsAssigning(true);
    setDateErrors({});
    try {
      await api.removeAssignment(ruleId, employeeId, effectiveTo);
      await Promise.all([fetchAssignments(), refetchList()]);
      showSuccess(effectiveTo ? 'Deduction end date saved' : 'Employee removed');
      return true;
    } catch (err) {
      return failed(err);
    } finally {
      setIsAssigning(false);
    }
  }, [ruleId, isAssigning, fetchAssignments, refetchList, failed]);

  const assignBulk = useCallback(async (employeeIds: number[], effectiveFrom?: string) => {
    if (!ruleId || isAssigning || !employeeIds.length) return false;
    setIsAssigning(true);
    setDateErrors({});
    try {
      const res = await api.assignBulk(ruleId, employeeIds, effectiveFrom);
      await Promise.all([fetchAssignments(), refetchList()]);
      showSuccess(`${res.count || employeeIds.length} employees assigned`);
      return true;
    } catch (err) {
      return failed(err);
    } finally {
      setIsAssigning(false);
    }
  }, [ruleId, isAssigning, fetchAssignments, refetchList, failed]);

  return {
    employees,
    total,
    isLoading,
    error,
    isAssigning,
    candidates,
    isSearching,
    dateErrors,
    clearDateErrors: () => setDateErrors({}),
    searchCandidates,
    assign,
    assignBulk,
    remove,
    refetch: fetchAssignments,
  };
}
