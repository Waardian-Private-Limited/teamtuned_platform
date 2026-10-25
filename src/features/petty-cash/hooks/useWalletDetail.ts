'use client';

import { useCallback, useState } from 'react';
import { useRemote } from '@/features/reimbursement/hooks/useRemote';
import * as api from '../api/petty-cash.api';
import { toMyWalletDetail, toWalletDetail } from '../types/petty-cash.mapper';

const PAGE_SIZE = 50;

/** HR wallet detail (`/wallets/:id`) or the spender's own (`/me/wallets/:id`), with the ledger paged server-side. */
export function useWalletDetail(id: number, scope: 'hr' | 'me' = 'hr') {
  const [page, setPageState] = useState(1);
  const [range, setRangeState] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const fetcher = useCallback(async () => {
    if (scope === 'me') {
      const d = toMyWalletDetail(await api.getMyWalletDetail(id, { page, pageSize: PAGE_SIZE }));
      return { wallet: d.wallet, ledger: d.ledger ?? [], ledgerTotal: d.ledgerTotal, openFundRequests: d.openFundRequests, cashCounts: d.cashCounts, isCustodian: d.ledger !== null };
    }
    const d = toWalletDetail(await api.getWallet(id, { page, pageSize: PAGE_SIZE, from: range.from, to: range.to }));
    return { ...d, isCustodian: true };
  }, [id, scope, page, range]);
  const r = useRemote(fetcher, `${scope}:${id}:${page}:${range.from}:${range.to}`);
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
