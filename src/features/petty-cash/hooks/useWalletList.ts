'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { SEARCH_DEBOUNCE_MS } from '@/features/expense-bills/constants/bill.constants';
import * as api from '../api/petty-cash.api';
import { DEFAULT_PAGE_SIZE } from '../constants/petty-cash.constants';
import { toWallet, toWalletTotals } from '../types/petty-cash.mapper';
import type { Wallet, WalletStatus, WalletTotals } from '../types/petty-cash.model';

export interface WalletFilters {
  status: WalletStatus | null;
  balance: 'low' | 'negative' | null;
  siteId: number | null;
  subOrgId: number | null;
  search: string;
  /** `-opened_at`: newest first. */
  sort: 'name' | 'balance' | '-opened_at';
}

export function useWalletList() {
  const [filters, setFilters] = useState<WalletFilters>({ status: null, balance: null, siteId: null, subOrgId: null, search: '', sort: 'name' });
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [rows, setRows] = useState<Wallet[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState<WalletTotals | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.listWallets({ ...filters, page, pageSize });
      if (id !== request.current) return;
      setRows((dto.items || []).map(toWallet));
      setTotal(Number(dto.total) || 0);
      setTotals(toWalletTotals(dto.totals));
    } catch (err) {
      if (id !== request.current) return;
      setRows([]);
      setTotal(0);
      setError(messageOf(err));
    } finally {
      if (id === request.current) {
        setIsFetching(false);
        setIsInitialLoading(false);
      }
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  // The search applied so far: the first page is shown again only when it really changes.
  const appliedSearch = useRef('');
  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchInput.trim();
      if (next === appliedSearch.current) return;
      appliedSearch.current = next;
      setFilters((f) => ({ ...f, search: next }));
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const update = useCallback((patch: Partial<WalletFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    appliedSearch.current = '';
    setFilters((f) => ({ ...f, status: null, balance: null, siteId: null, search: '' }));
    setPage(1);
  }, []);

  return {
    filters,
    update,
    searchInput,
    setSearchInput,
    rows,
    total,
    totals,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    isInitialLoading,
    isFetching,
    error,
    refetch: load,
    clearFilters,
    hasActiveFilters: Boolean(filters.search || filters.status || filters.balance || filters.siteId),
  };
}
