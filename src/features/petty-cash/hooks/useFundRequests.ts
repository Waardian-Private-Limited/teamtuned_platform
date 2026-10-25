'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SEARCH_DEBOUNCE_MS } from '@/features/expense-bills/constants/bill.constants';
import { useRemote } from '@/features/reimbursement/hooks/useRemote';
import * as api from '../api/petty-cash.api';
import { toFundRequest } from '../types/petty-cash.mapper';
import type { FundTab } from '../types/petty-cash.model';

const PAGE_SIZE = 25;

/** HR list of fund requests, optionally for one wallet; `searchInput` (wallet or requester name) is debounced. */
export function useFundRequests(walletId: number | null, initialTab: FundTab = 'to_pay') {
  const [tab, setTab] = useState<FundTab>(initialTab);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const applied = useRef('');
  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchInput.trim();
      if (next === applied.current) return;
      applied.current = next;
      setSearch(next);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);
  const fetcher = useCallback(async () => {
    const dto = await api.listFundRequests({ status: tab, walletId, search, page, pageSize: PAGE_SIZE });
    return { items: (dto.items || []).map(toFundRequest), total: Number(dto.total) || 0 };
  }, [tab, walletId, search, page]);
  const r = useRemote(fetcher, `${tab}:${walletId ?? ''}:${search}:${page}`);
  const changeTab = useCallback((next: FundTab) => {
    setTab(next);
    setPage(1);
  }, []);
  return {
    tab,
    setTab: changeTab,
    searchInput,
    setSearchInput,
    search,
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
