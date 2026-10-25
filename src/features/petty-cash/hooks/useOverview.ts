'use client';

import { useCallback } from 'react';
import { useRemote } from '@/features/reimbursement/hooks/useRemote';
import * as api from '../api/petty-cash.api';
import { toOverview } from '../types/petty-cash.mapper';

/** The HR dashboard (`GET /overview`), loaded once. */
export function useOverview() {
  const fetcher = useCallback(async () => toOverview(await api.getOverview()), []);
  return useRemote(fetcher, 'overview');
}
