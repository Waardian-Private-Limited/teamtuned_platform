'use client';

import { useCallback, useState } from 'react';
import { statusOf } from '@/lib/api/errors';
import { useRemote } from '@/features/reimbursement/hooks/useRemote';
import * as api from '../api/petty-cash.api';
import { toExpenseDetail } from '../types/petty-cash.mapper';

export function useExpenseDetail(id: number | null, scope: 'hr' | 'me') {
  const [forbidden, setForbidden] = useState(false);
  const fetcher = useCallback(async () => {
    setForbidden(false);
    try {
      return toExpenseDetail(scope === 'me' ? await api.getMyExpense(id as number) : await api.getExpense(id as number));
    } catch (err) {
      if (statusOf(err) === 403) setForbidden(true);
      throw err;
    }
  }, [id, scope]);
  const r = useRemote(id ? fetcher : null, `${scope}:${id ?? ''}`);
  return { detail: r.data, isLoading: r.isLoading, error: r.error, notFound: r.notFound, forbidden, refetch: r.refetch };
}
