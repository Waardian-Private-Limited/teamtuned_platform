'use client';

import { useEffect, useState } from 'react';
import { previewFilters, previewUnitMembers } from '../api/roster.api';
import type { PreviewEmployee, UnitFilters } from '../types/roster.types';
import { messageOf } from '@/lib/api/errors';

export function useTeamMemberPreview(
  unitId: number | null,
  filters: UnitFilters,
  subOrgId: number | null,
  parentId: number | null,
  savedKey: string | null
) {
  const [total, setTotal] = useState<number | null>(null);
  const [employees, setEmployees] = useState<PreviewEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const key = JSON.stringify(filters);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      const call = savedKey !== null && unitId
        ? previewUnitMembers(unitId)
        : previewFilters({ filters, sub_organization_id: subOrgId, parent_unit_id: parentId });
      call
        .then((r) => {
          if (!alive) return;
          setTotal(r.total);
          setEmployees(r.employees);
          setError('');
        })
        .catch((e) => alive && setError(messageOf(e)))
        .finally(() => alive && setLoading(false));
    }, 500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, subOrgId, parentId, unitId, savedKey]);

  return { total, employees, loading, error };
}
