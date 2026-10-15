'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/reimbursement.api';
import { toWallet, toWalletTotals } from '../types/reimbursement.mapper';
import type { Wallet, WalletStatus, WalletTotals } from '../types/reimbursement.model';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../constants/reimbursement.constants';

export interface WalletFilters {
  status: WalletStatus | null;
  balance: 'negative' | 'low' | null;
  departmentId: number | null;
  subOrgId: number | null;
  search: string;
  sort: 'name' | 'balance' | '-balance';
}

export function useWalletList() {
  const [filters, setFilters] = useState<WalletFilters>({ status: null, balance: null, departmentId: null, subOrgId: null, search: '', sort: 'name' });
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

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.search === searchInput.trim() ? f : { ...f, search: searchInput.trim() }));
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
    setFilters((f) => ({ ...f, status: null, balance: null, departmentId: null, search: '' }));
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
    hasActiveFilters: Boolean(filters.search || filters.status || filters.balance || filters.departmentId),
  };
}
