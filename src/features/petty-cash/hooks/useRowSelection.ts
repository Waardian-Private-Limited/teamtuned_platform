'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ExpenseSelection } from '../components/components/ExpenseTable';

/** Checked rows of a list. `reset` drops them (a new filter is a new list). */
export function useRowSelection() {
  const [ids, setIds] = useState<ReadonlySet<number>>(() => new Set());
  const toggle = useCallback(
    (id: number) =>
      setIds((s) => {
        const next = new Set(s);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    []
  );
  const setPage = useCallback(
    (page: number[], on: boolean) =>
      setIds((s) => {
        const next = new Set(s);
        page.forEach((id) => (on ? next.add(id) : next.delete(id)));
        return next;
      }),
    []
  );
  const reset = useCallback(() => setIds(new Set()), []);
  const selection: ExpenseSelection = useMemo(() => ({ ids, toggle, setPage }), [ids, toggle, setPage]);
  const list = useMemo(() => [...ids], [ids]);
  return { selection, ids: list, size: ids.size, reset };
}
