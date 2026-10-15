'use client';

import { useCallback, useState } from 'react';
import * as api from '../api/reimbursement.api';
import { toFundRequest } from '../types/reimbursement.mapper';
import { useRemote } from './useRemote';

export type FundTab = 'pending' | 'to_pay' | 'paid' | 'closed';

/** HR list of fund requests, optionally for one wallet. */
export function useFundRequests(walletId: number | null, subOrgId: number | null = null) {
  const [tab, setTab] = useState<FundTab>('to_pay');
  const [page, setPage] = useState(1);
  const fetcher = useCallback(async () => {
    const dto = await api.listFundRequests({ status: tab, walletId, subOrgId, page, pageSize: 25 });
    return { items: (dto.items || []).map(toFundRequest), total: Number(dto.total) || 0 };
  }, [tab, walletId, subOrgId, page]);
  const r = useRemote(fetcher, `${tab}:${walletId ?? ''}:${subOrgId ?? ''}:${page}`);
  const changeTab = useCallback((next: FundTab) => {
    setTab(next);
    setPage(1);
  }, []);
  return {
    tab,
    setTab: changeTab,
    page,
    setPage,
    rows: r.data?.items ?? [],
    total: r.data?.total ?? 0,
    totalPages: Math.max(1, Math.ceil((r.data?.total ?? 0) / 25)),
    isLoading: r.isLoading,
    isFetching: r.isFetching,
    error: r.error,
    refetch: r.refetch,
  };
}
