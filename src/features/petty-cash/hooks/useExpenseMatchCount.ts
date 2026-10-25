'use client';

import { useEffect, useRef, useState } from 'react';
import { SEARCH_DEBOUNCE_MS } from '@/features/expense-bills/constants/bill.constants';
import { placeErrors } from '@/features/expense-bills/utils/errors';
import * as api from '../api/petty-cash.api';

export interface ExpenseMatchCount {
  /** null while unknown (first load, skipped or failed). */
  count: number | null;
  loading: boolean;
  /** Field errors from a 400, keyed like the export body. */
  fields: Record<string, string>;
  /** Any other failure, as one line. */
  error: string;
}

/**
 * "N expenses match": the list endpoint with the same filters and `pageSize=1`, debounced and
 * aborted when the filters change. `query` null skips the call (dialog closed, or picked expenses).
 */
export function useExpenseMatchCount(scope: 'hr' | 'me', query: api.ExpenseQuery | null, register = false): ExpenseMatchCount {
  const [state, setState] = useState<ExpenseMatchCount>({ count: null, loading: false, fields: {}, error: '' });
  const request = useRef(0);
  const key = query ? JSON.stringify([scope, register, query]) : '';

  useEffect(() => {
    const id = ++request.current;
    if (!key) {
      setState({ count: null, loading: false, fields: {}, error: '' });
      return;
    }
    const [, reg, q] = JSON.parse(key) as [string, boolean, api.ExpenseQuery];
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(() => {
      const page = { page: 1, pageSize: 1 };
      const call = scope === 'me' ? api.listMyExpenses({ ...q, ...page }) : reg ? api.listInward({ ...q, ...page }) : api.listExpenses({ ...q, ...page });
      call
        .then((dto) => id === request.current && setState({ count: Number(dto.total) || 0, loading: false, fields: {}, error: '' }))
        .catch((err) => {
          if (id !== request.current) return;
          const placed = placeErrors(err, () => true);
          setState({ count: null, loading: false, fields: placed.fields, error: placed.form });
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [key, scope]);

  return state;
}
