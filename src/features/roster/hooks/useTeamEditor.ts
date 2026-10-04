'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createUnit, getUnit, saveDemands, saveManagers, saveMembers, updateUnit,
} from '../api/roster.api';
import type { DemandInput, MemberInput, RosterUnitDetail, UnitInput } from '../types/roster.types';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';

export type TeamTab = 'basics' | 'members' | 'managers' | 'demand' | 'approvals' | 'rules';
export interface TabError {
  field?: string;
  message: string;
}

function toTabError(err: unknown): TabError {
  const data = err instanceof ApiError ? (err.data as { details?: { field?: string }; field?: string } | null) : null;
  const field = data?.details?.field ?? data?.field;
  if (field) return { field, message: messageOf(err) };
  return { message: messageOf(err) };
}

export function useTeamEditor(unitId: number | null, onChanged: () => void) {
  const [detail, setDetail] = useState<RosterUnitDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(unitId));
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState<TeamTab | null>(null);
  const [errors, setErrors] = useState<Partial<Record<TeamTab, TabError>>>({});
  const busy = useRef(false);

  useEffect(() => {
    let alive = true;
    setErrors({});
    setLoadError('');
    if (!unitId) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getUnit(unitId)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setLoadError(messageOf(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [unitId]);

  const run = useCallback(async (tab: TeamTab, call: () => Promise<RosterUnitDetail>, success: string) => {
    if (busy.current) return false;
    busy.current = true;
    setSaving(tab);
    setErrors((prev) => ({ ...prev, [tab]: undefined }));
    try {
      const next = await call();
      setDetail(next);
      showSuccess(success);
      onChanged();
      return true;
    } catch (err) {
      const te = toTabError(err);
      setErrors((prev) => ({ ...prev, [tab]: te }));
      if (!te.field) showError(te.message);
      return false;
    } finally {
      busy.current = false;
      setSaving(null);
    }
  }, [onChanged]);

  const saveBasics = useCallback((input: UnitInput) => run('basics', () => (
    detail ? updateUnit(detail.id, input) : createUnit(input)
  ), detail ? 'Team details saved' : 'Team created'), [run, detail]);

  const saveFilters = useCallback((filters: NonNullable<UnitInput['filters']>) => detail
    ? run('members', () => updateUnit(detail.id, { filters }), 'Saved') : Promise.resolve(false), [run, detail]);

  const saveMemberList = useCallback(async (filters: NonNullable<UnitInput['filters']>, members: MemberInput[]) => {
    if (!detail) return false;
    const ok = await run('members', () => updateUnit(detail.id, { filters }), 'Saved');
    if (!ok) return false;
    return run('members', () => saveMembers(detail.id, members), 'Members saved');
  }, [run, detail]);

  const saveManagerList = useCallback((ids: number[]) => detail
    ? run('managers', () => saveManagers(detail.id, ids), 'Managers saved') : Promise.resolve(false), [run, detail]);

  const saveDemandList = useCallback((rows: DemandInput[]) => detail
    ? run('demand', () => saveDemands(detail.id, rows), 'Demand saved') : Promise.resolve(false), [run, detail]);

  const saveChain = useCallback((chain: UnitInput['approval_chain']) => detail
    ? run('approvals', () => updateUnit(detail.id, { approval_chain: chain }), 'Approval chain saved') : Promise.resolve(false), [run, detail]);

  const saveSettings = useCallback((settings: NonNullable<UnitInput['settings']>) => detail
    ? run('rules', () => updateUnit(detail.id, { settings }), 'Rules saved') : Promise.resolve(false), [run, detail]);

  return {
    detail, loading, loadError, saving, errors, saveBasics, saveFilters, saveMemberList, saveManagerList, saveDemandList, saveChain, saveSettings,
  };
}
