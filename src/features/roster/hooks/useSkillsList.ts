'use client';

import { useCallback, useEffect, useState } from 'react';
import { createSkill, deleteSkill, listSkills, renameSkill } from '../api/roster.api';
import type { Skill } from '../types/roster.types';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';

export function useSkillsList() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<{ id: number | 'new'; message: string } | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await listSkills();
      setSkills(res.skills);
      setError('');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const run = useCallback(async (id: number | 'new', action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setRowError(null);
    try {
      await action();
      showSuccess(success);
      await refetch();
      return true;
    } catch (err) {
      setRowError({ id, message: messageOf(err) });
      return false;
    } finally {
      setBusy(false);
    }
  }, [refetch]);

  return {
    skills, loading, error, busy, rowError, clearRowError: () => setRowError(null), refetch,
    add: (name: string, subOrgId: number | null) => run('new', () => createSkill({ name: name.trim(), sub_organization_id: subOrgId }), 'Skill added'),
    rename: (id: number, name: string) => run(id, () => renameSkill(id, name.trim()), 'Skill renamed'),
    remove: (id: number) => run(id, () => deleteSkill(id), 'Skill deleted'),
  };
}
