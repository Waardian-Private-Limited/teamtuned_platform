'use client';

import { useCallback, useState } from 'react';
import { useRemote } from '@/features/reimbursement/hooks/useRemote';
import * as api from '../api/petty-cash.api';
import { toFundRequest } from '../types/petty-cash.mapper';

const PAGE_SIZE = 25;

/** The employee's own fund requests (`GET /me/fund-requests`). */
export function useMyFundRequests() {
  const [page, setPage] = useState(1);
  const fetcher = useCallback(async () => {
    const dto = await api.listMyFundRequests({ page, pageSize: PAGE_SIZE });
    return { items: (dto.items || []).map(toFundRequest), total: Number(dto.total) || 0 };
  }, [page]);
  const r = useRemote(fetcher, String(page));
  return {
    page,
    setPage,
    pageSize: PAGE_SIZE,
    rows: r.data?.items ?? [],
    total: r.data?.total ?? 0,
    totalPages: Math.max(1, Math.ceil((r.data?.total ?? 0) / PAGE_SIZE)),
    isLoading: r.isLoading,
    isFetching: r.isFetching,
    error: r.error,
    refetch: r.refetch,
  };
}
