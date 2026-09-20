'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import { toAssignments } from '../types/payroll-setup.mapper';
import type { AssignedEmployee } from '../types/payroll-setup.model';
import { messageOf } from '../utils/asyncAction';
import { showError, showSuccess } from '@/lib/toast';

export function useDebitAssignments(ruleId: number | null, refetchList: () => Promise<void>) {
  const [employees, setEmployees] = useState<AssignedEmployee[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [candidates, setCandidates] = useState<Array<{ id: number; name: string; designation: string | null; email: string | null }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchSeqRef = useRef(0);

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

  const assign = useCallback(async (employeeId: number) => {
    if (!ruleId || isAssigning) return false;
    setIsAssigning(true);
    try {
      await api.assignDebit(ruleId, employeeId);
      await Promise.all([fetchAssignments(), refetchList()]);
      showSuccess('Employee assigned');
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setIsAssigning(false);
    }
  }, [ruleId, isAssigning, fetchAssignments, refetchList]);

  const remove = useCallback(async (employeeId: number) => {
    if (!ruleId || isAssigning) return false;
    setIsAssigning(true);
    try {
      await api.removeAssignment(ruleId, employeeId);
      await Promise.all([fetchAssignments(), refetchList()]);
      showSuccess('Employee removed');
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setIsAssigning(false);
    }
  }, [ruleId, isAssigning, fetchAssignments, refetchList]);

  const assignBulk = useCallback(async (employeeIds: number[]) => {
    if (!ruleId || isAssigning || !employeeIds.length) return false;
    setIsAssigning(true);
    try {
      const res = await api.assignBulk(ruleId, employeeIds);
      await Promise.all([fetchAssignments(), refetchList()]);
      showSuccess(`${res.count || employeeIds.length} employees assigned`);
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setIsAssigning(false);
    }
  }, [ruleId, isAssigning, fetchAssignments, refetchList]);

  return {
    employees,
    total,
    isLoading,
    error,
    isAssigning,
    candidates,
    isSearching,
    searchCandidates,
    assign,
    assignBulk,
    remove,
    refetch: fetchAssignments,
  };
}
