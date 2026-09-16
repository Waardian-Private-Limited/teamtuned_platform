'use client';

import { useCallback, useEffect, useState } from 'react';
import * as rolesApi from '../api/roles.api';
import { toRoleEmployees } from '../types/roles.mapper';
import type { RoleEmployee, RoleEmployeeCandidate } from '../types/roles.model';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';

// Backs the "role → employees" drawer: current holders plus a search-to-add
// candidate picker, mirroring useDepartmentHeads' load/assign/remove shape.
export function useRoleEmployees(roleId: number | null, onChanged?: () => void) {
  const [holders, setHolders] = useState<RoleEmployee[]>([]);
  const [candidates, setCandidates] = useState<RoleEmployeeCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadHolders = useCallback(async () => {
    if (!roleId) return;
    setIsLoading(true);
    try {
      const dto = await rolesApi.listRoleEmployees(roleId);
      setHolders(toRoleEmployees(dto).holders);
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    if (roleId) loadHolders();
    else setHolders([]);
  }, [roleId, loadHolders]);

  const searchCandidates = useCallback(async (term: string) => {
    if (!roleId) return;
    setCandidatesLoading(true);
    try {
      const dto = await rolesApi.listRoleEmployees(roleId, term);
      setCandidates(toRoleEmployees(dto).candidates);
    } catch {
      setCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    if (roleId) searchCandidates('');
  }, [roleId, searchCandidates]);

  const assign = useCallback(async (employeeId: number) => {
    if (!roleId) return;
    setIsSaving(true);
    try {
      await rolesApi.assignRoleEmployees(roleId, [employeeId]);
      await loadHolders();
      await searchCandidates('');
      onChanged?.();
      showSuccess('Employee assigned to role');
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setIsSaving(false);
    }
  }, [roleId, loadHolders, searchCandidates, onChanged]);

  const remove = useCallback(async (employeeId: number) => {
    if (!roleId) return;
    setIsSaving(true);
    try {
      await rolesApi.removeRoleEmployees(roleId, [employeeId]);
      await loadHolders();
      await searchCandidates('');
      onChanged?.();
      showSuccess('Employee removed from role');
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setIsSaving(false);
    }
  }, [roleId, loadHolders, searchCandidates, onChanged]);

  return { holders, candidates, isLoading, candidatesLoading, isSaving, searchCandidates, assign, remove };
}
