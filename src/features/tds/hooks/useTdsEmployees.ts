'use client';

import { useEffect, useMemo, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '@/features/payroll-setup/api/payrollSetup.api';
import { toAssignments } from '@/features/payroll-setup/types/payroll-setup.mapper';
import type { AssignedEmployee } from '@/features/payroll-setup/types/payroll-setup.model';

/**
 * Everyone assigned the TDS deduction rule: the people who declare. The server pages at
 * 100, so every page is read once and the search runs here.
 */
export function useTdsEmployees(ruleId: number | null) {
  const [employees, setEmployees] = useState<AssignedEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!ruleId) {
      setEmployees([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError('');
    (async () => {
      const all: AssignedEmployee[] = [];
      for (let page = 1; ; page += 1) {
        const dto = await api.listRuleAssignments(ruleId, page, 100);
        all.push(...toAssignments(dto).employees);
        if (page >= Number(dto.pages || 1)) break;
      }
      return all;
    })()
      .then((all) => !cancelled && setEmployees(all))
      .catch((err) => !cancelled && setError(messageOf(err)))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ruleId]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((e) => [e.name, e.designation, e.email].some((v) => (v || '').toLowerCase().includes(term)));
  }, [employees, search]);

  return { employees: visible, total: employees.length, isLoading, error, search, setSearch };
}
