'use client';

import { useEffect, useState } from 'react';
import { searchEmployees } from '../api/roster.api';
import type { EmployeeLite } from '../types/roster.types';

export function useTeamsEmployeeSearch(term: string, subOrgId: number | null | undefined, enabled = true) {
  const [results, setResults] = useState<EmployeeLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      searchEmployees({ q: term.trim() || undefined, sub_organization_id: subOrgId ?? undefined })
        .then((r) => alive && setResults(r.employees))
        .catch(() => alive && setResults([]))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [term, subOrgId, enabled]);

  return { results, loading };
}
