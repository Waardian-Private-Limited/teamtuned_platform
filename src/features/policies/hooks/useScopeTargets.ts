'use client';

import { useEffect, useState } from 'react';
import { listDepartments } from '@/features/departments/api/departments.api';
import { listRoles } from '@/features/roles/api/roles.api';
import { listSites } from '@/features/sites/api/sites.api';
import { listActiveSubOrganizations } from '@/features/sub-organizations/api/subOrganizations.api';
import { messageOf } from '@/lib/api/errors';
import type { ScopeType } from '../types/policies.model';

export interface ScopeTarget {
  id: number;
  label: string;
}

/**
 * The pickable targets for an assignment scope — departments, roles, sites
 * and sub-organizations come from their own feature APIs. `employee` and
 * `employee_type` have no v2 list endpoint yet, so the dialog falls back to
 * a plain id for those (see SCOPE_TYPES_WITHOUT_PICKER).
 */
export function useScopeTargets(scopeType: ScopeType) {
  const [targets, setTargets] = useState<ScopeTarget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<ScopeTarget[]> {
      switch (scopeType) {
        case 'department': {
          const res = await listDepartments({ status: 'active', pageSize: 200 });
          return (res.departments || []).map((d) => ({ id: d.id, label: d.name }));
        }
        case 'role': {
          const res = await listRoles({ status: 'active', pageSize: 200 });
          return (res.roles || []).map((r) => ({ id: r.id, label: r.department_name ? `${r.name} · ${r.department_name}` : r.name }));
        }
        case 'site': {
          const res = await listSites({ status: 'active', pageSize: 200 });
          return (res.sites || []).map((s) => ({ id: s.id, label: s.name }));
        }
        case 'sub_organization': {
          const res = await listActiveSubOrganizations();
          return (res.sub_organizations || []).map((s) => ({ id: s.id, label: s.name }));
        }
        default:
          return [];
      }
    }

    setError('');
    setTargets([]);
    if (scopeType === 'organization' || scopeType === 'employee' || scopeType === 'employee_type') return;

    setIsLoading(true);
    load()
      .then((result) => {
        if (!cancelled) setTargets(result);
      })
      .catch((err) => {
        if (!cancelled) setError(messageOf(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scopeType]);

  return { targets, isLoading, error };
}
