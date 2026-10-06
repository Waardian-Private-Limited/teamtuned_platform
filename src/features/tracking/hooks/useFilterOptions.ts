'use client';

import { useEffect, useState } from 'react';
import { listDepartments } from '@/features/departments/api/departments.api';
import { listRoles } from '@/features/roles/api/roles.api';
import { listSites } from '@/features/sites/api/sites.api';

export interface Option {
  value: number;
  label: string;
}

const cache: { value?: { departments: Option[]; roles: Option[]; sites: Option[] } } = {};

/** Departments, roles and sites for the filter bars; loaded once per page load. */
export function useFilterOptions() {
  const [options, setOptions] = useState(cache.value ?? { departments: [], roles: [], sites: [] });

  useEffect(() => {
    if (cache.value) return;
    let alive = true;
    Promise.all([listDepartments({ pageSize: 200 }), listRoles({ pageSize: 200 }), listSites({ pageSize: 200 })])
      .then(([d, r, s]) => {
        const next = {
          departments: d.departments.map((x) => ({ value: x.id, label: x.name })),
          roles: r.roles.map((x) => ({ value: x.id, label: x.name })),
          sites: s.sites.map((x) => ({ value: x.id, label: x.name })),
        };
        cache.value = next;
        if (alive) setOptions(next);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return options;
}
