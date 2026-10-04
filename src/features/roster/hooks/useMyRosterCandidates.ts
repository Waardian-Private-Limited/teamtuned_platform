'use client';

import { useMemo } from 'react';
import { swapCandidates } from '../api/roster.api';
import { useEmployeeRosterQuery } from './useEmployeeRosterQuery';

export function useMyRosterCandidates(fromDate: string, fromSeq: number, enabled: boolean) {
  const query = useEmployeeRosterQuery(() => swapCandidates({ fromDate, fromSeq }), `cand:${fromDate}:${fromSeq}`, enabled);
  const colleagues = useMemo(() => query.data?.colleagues || [], [query.data]);
  const people = useMemo(() => {
    const seen = new Map<number, string>();
    for (const c of colleagues) if (!seen.has(c.employee_id)) seen.set(c.employee_id, c.name);
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [colleagues]);
  return { colleagues, people, loading: query.loading, error: query.error };
}
