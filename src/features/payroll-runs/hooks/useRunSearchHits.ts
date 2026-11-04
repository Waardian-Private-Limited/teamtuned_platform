'use client';

import { useEffect, useRef, useState } from 'react';
import * as api from '../api/payrollRuns.api';
import type { ItemFilters, Run } from '../types/payrollRuns.model';

const ANY: ItemFilters = { search: '', status: 'all', siteId: null, departmentId: null, sort: 'name', dir: 'asc' };

/**
 * With payroll split by company, one list shows one company's run. A searched name may sit in another company's
 * run, so every run is asked how many employees match the search: the page can then jump to the run that has them
 * and point at the others. Empty search or a single run: nothing to ask.
 */
export function useRunSearchHits(runs: Run[], search: string, version: number) {
  const [hits, setHits] = useState<Map<number, number>>(new Map());
  const [searching, setSearching] = useState(false);
  const reqRef = useRef(0);
  const ids = runs.filter((r) => r.id !== null).map((r) => r.id as number);
  const key = ids.join(',');
  const term = search.trim();

  useEffect(() => {
    if (!term || ids.length < 2) {
      setHits(new Map());
      setSearching(false);
      return undefined;
    }
    const req = ++reqRef.current;
    setSearching(true);
    Promise.all(ids.map((id) => api.listItems(id, { ...ANY, search: term }, 1, 1).then((r) => [id, Number(r.total || 0)] as const).catch(() => [id, 0] as const)))
      .then((pairs) => { if (req === reqRef.current) setHits(new Map(pairs)); })
      .finally(() => { if (req === reqRef.current) setSearching(false); });
    return () => { reqRef.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for `ids`
  }, [term, key, version]);

  return { hits, searching };
}
