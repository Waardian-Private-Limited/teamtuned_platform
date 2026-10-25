'use client';

import { useCallback } from 'react';
import { useRemote } from '@/features/reimbursement/hooks/useRemote';
import * as api from '../api/petty-cash.api';
import { toMyOverview } from '../types/petty-cash.mapper';

/** The signed-in user's petty cash start: wallets they may spend from, categories, month and recent. */
export function useMyOverview(enabled = true) {
  const fetcher = useCallback(async () => toMyOverview(await api.getMyOverview()), []);
  const r = useRemote(enabled ? fetcher : null, 'my-overview');
  return { data: r.data, isLoading: r.isLoading, isFetching: r.isFetching, error: r.error, refetch: r.refetch };
}
