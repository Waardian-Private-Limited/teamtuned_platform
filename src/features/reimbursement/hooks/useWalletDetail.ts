'use client';

import { useCallback, useState } from 'react';
import * as api from '../api/reimbursement.api';
import { toWalletDetail } from '../types/reimbursement.mapper';
import { useRemote } from './useRemote';

const PAGE_SIZE = 50;

export function useWalletDetail(id: number) {
  const [page, setPageState] = useState(1);
  const [range, setRangeState] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const fetcher = useCallback(async () => toWalletDetail(await api.getWallet(id, { page, pageSize: PAGE_SIZE, from: range.from, to: range.to })), [id, page, range]);
  const r = useRemote(fetcher, `${id}:${page}:${range.from}:${range.to}`);
  const setRange = useCallback((next: { from: string; to: string }) => {
    setRangeState(next);
    setPageState(1);
  }, []);
  const total = r.data?.ledgerTotal ?? 0;
  return {
    detail: r.data,
    isLoading: r.isLoading,
    isFetching: r.isFetching,
    error: r.error,
    notFound: r.notFound,
    refetch: r.refetch,
    page,
    setPage: setPageState,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    range,
    setRange,
  };
}
