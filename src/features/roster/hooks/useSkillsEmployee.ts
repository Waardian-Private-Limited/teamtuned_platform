'use client';

import { useCallback, useEffect, useState } from 'react';
import { getEmployeeSkills, saveEmployeeSkills } from '../api/roster.api';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';

export interface EmployeeSkillRow {
  skillId: number;
  name: string;
  validUntil: string;
}

export function useSkillsEmployee(employeeId: number | null, onSaved: () => void) {
  const [rows, setRows] = useState<EmployeeSkillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setRows([]);
    setError('');
    setDirty(false);
    if (!employeeId) return;
    let alive = true;
    setLoading(true);
    getEmployeeSkills(employeeId)
      .then((r) => alive && setRows(r.skills.map((s) => ({ skillId: s.skill_id, name: s.name, validUntil: s.valid_until ? String(s.valid_until).slice(0, 10) : '' }))))
      .catch((e) => alive && setError(messageOf(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [employeeId]);

  const change = useCallback((fn: (r: EmployeeSkillRow[]) => EmployeeSkillRow[]) => {
    setRows(fn);
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    if (!employeeId) return;
    setSaving(true);
    setError('');
    try {
      await saveEmployeeSkills(employeeId, rows.map((r) => ({ skillId: r.skillId, validUntil: r.validUntil || null })));
      showSuccess('Skills saved');
      setDirty(false);
      onSaved();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }, [employeeId, rows, onSaved]);

  return { rows, loading, saving, error, dirty, change, save };
}
