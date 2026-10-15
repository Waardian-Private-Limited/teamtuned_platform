'use client';

import { useCallback, useState } from 'react';
import * as api from '../api/reimbursement.api';
import { toOverview } from '../types/reimbursement.mapper';
import { useRemote } from './useRemote';

export function useOverview() {
  const [subOrgId, setSubOrgId] = useState<number | null>(null);
  const fetcher = useCallback(async () => toOverview(await api.getOverview({ subOrgId })), [subOrgId]);
  const r = useRemote(fetcher, String(subOrgId ?? ''));
  return { subOrgId, setSubOrgId, data: r.data, isLoading: r.isLoading, isFetching: r.isFetching, error: r.error, refetch: r.refetch };
}
