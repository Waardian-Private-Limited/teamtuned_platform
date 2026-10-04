'use client';

import { useCallback, useState } from 'react';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../api/roster.api';
import type { Candidate, OpenShift } from '../types/roster.types';

export function useRosterBoardOpenShifts(rosterId: number, unitId: number | undefined, refresh: () => Promise<unknown>) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<Record<number, Candidate[]>>({});
  const [loadingCandidatesId, setLoadingCandidatesId] = useState<number | null>(null);
  const [refusal, setRefusal] = useState<{ shiftId: number; employeeId: number; message: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadCandidates = useCallback(
    async (shift: OpenShift) => {
      setLoadingCandidatesId(shift.id);
      try {
        const res = await api.suggestReplacement(rosterId, { date: shift.work_date, templateId: shift.shift_template_id, roleId: shift.role_id, skillId: shift.skill_id });
        setCandidates((c) => ({ ...c, [shift.id]: res.candidates }));
      } catch (err) {
        showError(messageOf(err));
      } finally {
        setLoadingCandidatesId(null);
      }
    },
    [rosterId]
  );

  const assign = useCallback(
    async (shift: OpenShift, employeeId: number, force = false) => {
      setBusyId(shift.id);
      setRefusal(null);
      try {
        await api.assignOpenShift(shift.id, { employeeId, force: force || undefined });
        showSuccess('Shift assigned');
        await refresh();
        return true;
      } catch (err) {
        if (err instanceof ApiError && !force) setRefusal({ shiftId: shift.id, employeeId, message: messageOf(err) });
        else showError(messageOf(err));
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [refresh]
  );

  const close = useCallback(
    async (shift: OpenShift) => {
      setBusyId(shift.id);
      try {
        await api.closeOpenShift(shift.id);
        await refresh();
      } catch (err) {
        showError(messageOf(err));
      } finally {
        setBusyId(null);
      }
    },
    [refresh]
  );

  const create = useCallback(
    async (input: { date: string; templateId: number; needed: number; isOvertime: boolean }) => {
      if (!unitId) return false;
      setCreating(true);
      setCreateError('');
      try {
        await api.createOpenShift({ unitId, ...input });
        await refresh();
        return true;
      } catch (err) {
        setCreateError(messageOf(err));
        return false;
      } finally {
        setCreating(false);
      }
    },
    [unitId, refresh]
  );

  return { busyId, candidates, loadingCandidatesId, loadCandidates, assign, close, create, creating, createError, refusal, clearRefusal: () => setRefusal(null) };
}
