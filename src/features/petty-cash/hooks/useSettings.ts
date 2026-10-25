'use client';

import { useCallback, useMemo } from 'react';
import { useRemote } from '@/features/reimbursement/hooks/useRemote';
import * as api from '../api/petty-cash.api';
import { toSettingsBundle } from '../types/petty-cash.mapper';

/** Org default, per-company overrides and the effective settings. */
export function useSettings() {
  const fetcher = useCallback(async () => toSettingsBundle(await api.getSettings()), []);
  const r = useRemote(fetcher, 'settings');
  return useMemo(() => ({ data: r.data, isLoading: r.isLoading, isFetching: r.isFetching, error: r.error, refetch: r.refetch }), [r.data, r.isLoading, r.isFetching, r.error, r.refetch]);
}
