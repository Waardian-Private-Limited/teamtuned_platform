'use client';

import { useEffect, useState } from 'react';
import { listSites } from '@/features/sites/api/sites.api';
import { listDepartments } from '@/features/departments/api/departments.api';
import type { FilterOption } from '../types/payrollRuns.model';

export function useFilterOptions(subOrgId: number | null) {
  const [sites, setSites] = useState<FilterOption[]>([]);
  const [departments, setDepartments] = useState<FilterOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      listSites({ pageSize: 200, subOrgId }),
      listDepartments({ pageSize: 200, subOrgId }),
    ]).then(([s, d]) => {
      if (cancelled) return;
      setSites(s.status === 'fulfilled' ? (s.value.sites || []).map((x) => ({ value: x.id, label: x.name })) : []);
      setDepartments(d.status === 'fulfilled' ? (d.value.departments || []).map((x) => ({ value: x.id, label: x.name })) : []);
    });
    return () => {
      cancelled = true;
    };
  }, [subOrgId]);

  return { sites, departments };
}
