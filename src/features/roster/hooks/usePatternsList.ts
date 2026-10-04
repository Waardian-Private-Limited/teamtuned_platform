'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPattern, deletePattern, listPatterns, updatePattern } from '../api/roster.api';
import type { Pattern, PatternPreset } from '../types/roster.types';
import { loadShiftOptions, type ShiftOpt } from './useTeamsCatalog';
import type { CycleCell } from '../utils/patternCycle';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';

export interface PatternSaveInput {
  name: string;
  cycle: CycleCell[];
  status: 'active' | 'inactive';
  sub_organization_id: number | null;
}

export function usePatternsList() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [presets, setPresets] = useState<PatternPreset[]>([]);
  const [shifts, setShifts] = useState<ShiftOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<{ field?: string; message: string } | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const refetch = useCallback(async () => {
    try {
      const res = await listPatterns();
      setPatterns(res.patterns);
      setPresets(res.presets);
      setError('');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    loadShiftOptions().then(setShifts).catch(() => setShifts([]));
  }, [refetch]);

  const save = useCallback(async (id: number | null, input: PatternSaveInput) => {
    setSaving(true);
    setFormError(null);
    try {
      if (id) await updatePattern(id, { name: input.name, cycle: input.cycle, status: input.status });
      else await createPattern({ name: input.name, cycle: input.cycle, sub_organization_id: input.sub_organization_id });
      showSuccess(id ? 'Pattern updated' : 'Pattern created');
      await refetch();
      return true;
    } catch (err) {
      const message = messageOf(err);
      setFormError({ field: /name/i.test(message) ? 'name' : /day|shift|cycle/i.test(message) ? 'cycle' : undefined, message });
      return false;
    } finally {
      setSaving(false);
    }
  }, [refetch]);

  const remove = useCallback(async (p: Pattern) => {
    setSaving(true);
    setDeleteError('');
    try {
      await deletePattern(p.id);
      showSuccess('Pattern deleted');
      await refetch();
      return true;
    } catch (err) {
      setDeleteError(messageOf(err));
      return false;
    } finally {
      setSaving(false);
    }
  }, [refetch]);

  const toggle = useCallback(async (p: Pattern) => {
    try {
      await updatePattern(p.id, { status: p.status === 'active' ? 'inactive' : 'active' });
      await refetch();
    } catch (err) {
      showError(messageOf(err));
    }
  }, [refetch]);

  const visible = useMemo(() => {
    const t = searchInput.trim().toLowerCase();
    return t ? patterns.filter((p) => p.name.toLowerCase().includes(t)) : patterns;
  }, [patterns, searchInput]);

  return {
    patterns, visible, presets, shifts, loading, error, searchInput, setSearch, saving, formError, clearFormError: () => setFormError(null),
    deleteError, clearDeleteError: () => setDeleteError(''), save, remove, toggle,
  };
}
