'use client';

import { useCallback } from 'react';
import * as api from '../api/reimbursement.api';
import { toClaimDetail } from '../types/reimbursement.mapper';
import { useRemote } from './useRemote';

export function useClaimDetail(id: number | null, scope: 'hr' | 'me') {
  const fetcher = useCallback(async () => toClaimDetail(scope === 'me' ? await api.getMyClaim(id as number) : await api.getClaim(id as number)), [id, scope]);
  const r = useRemote(id ? fetcher : null, `${scope}:${id ?? ''}`);
  return { detail: r.data, isLoading: r.isLoading, error: r.error, notFound: r.notFound, refetch: r.refetch };
}
