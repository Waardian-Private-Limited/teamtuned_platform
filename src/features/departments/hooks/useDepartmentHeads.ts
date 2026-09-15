'use client';

import { useCallback, useEffect, useState } from 'react';
import * as departmentsApi from '../api/departments.api';
import { toDepartmentHeadsPanel, toHeadCandidates } from '../types/departments.mapper';
import type { DepartmentHeadsPanel, HeadCandidate } from '../types/departments.model';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';

/**
 * Loads the composed heads panel for one department and mutates it. Every
 * assign/remove saves immediately (there is no bulk "Save" to forget) and
 * calls `onChanged` — normally the department list's refetch — so the list's
 * Heads column reflects the change as soon as the drawer updates.
 */
export function useDepartmentHeads(departmentId: number | null, onChanged?: () => void) {
  const [panel, setPanel] = useState<DepartmentHeadsPanel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [candidates, setCandidates] = useState<HeadCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const loadPanel = useCallback(async () => {
    if (!departmentId) return;
    setIsLoading(true);
    try {
      const dto = await departmentsApi.getDepartmentHeads(departmentId);
      setPanel(toDepartmentHeadsPanel(dto));
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    if (departmentId) loadPanel();
    else setPanel(null);
  }, [departmentId, loadPanel]);

  const searchCandidates = useCallback(async (term: string) => {
    setCandidatesLoading(true);
    try {
      const dto = await departmentsApi.listHeadCandidates(term);
      setCandidates(toHeadCandidates(dto.candidates));
    } catch {
      setCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  }, []);

  // Prime the picker with an unfiltered page so it isn't empty before typing.
  useEffect(() => {
    if (departmentId) searchCandidates('');
  }, [departmentId, searchCandidates]);

  const assignHead = useCallback(async (siteId: number | null, employeeId: number) => {
    if (!departmentId) return;
    setIsSaving(true);
    try {
      await departmentsApi.assignDepartmentHead(departmentId, { siteId, employeeId });
      await loadPanel();
      onChanged?.();
      showSuccess(siteId ? 'Site head updated' : 'Department head updated');
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setIsSaving(false);
    }
  }, [departmentId, loadPanel, onChanged]);

  const removeHead = useCallback(async (siteId: number | null) => {
    if (!departmentId) return;
    setIsSaving(true);
    try {
      await departmentsApi.removeDepartmentHead(departmentId, siteId);
      await loadPanel();
      onChanged?.();
      showSuccess('Head removed');
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setIsSaving(false);
    }
  }, [departmentId, loadPanel, onChanged]);

  return { panel, isLoading, isSaving, candidates, candidatesLoading, searchCandidates, assignHead, removeHead };
}
