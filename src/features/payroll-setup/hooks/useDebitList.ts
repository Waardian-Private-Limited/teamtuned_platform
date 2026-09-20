'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import { toDebitList } from '../types/payroll-setup.mapper';
import type { DebitRule } from '../types/payroll-setup.model';
import { messageOf } from '../utils/asyncAction';
import type { StatusFilter } from '../constants/payroll-setup.constants';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../constants/payroll-setup.constants';

export function useDebitList() {
  const [debits, setDebits] = useState<DebitRule[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatusState] = useState<StatusFilter>('all');
  const [category, setCategoryState] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const inFlightRef = useRef(false);

  const fetchDebits = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.listDebitRules({ search, status, category, page, pageSize });
      const result = toDebitList(dto);
      setDebits(result.debits);
      setTotal(result.total);
      setTotalPages(result.pages);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      inFlightRef.current = false;
      setIsInitialLoading(false);
      setIsFetching(false);
    }
  }, [search, status, category, page, pageSize]);

  useEffect(() => {
    fetchDebits();
  }, [fetchDebits]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const setStatus = useCallback((v: StatusFilter) => { setStatusState(v); setPage(1); }, []);
  const setCategory = useCallback((v: string) => { setCategoryState(v); setPage(1); }, []);
  const setPageSize = useCallback((v: number) => { setPageSizeState(v); setPage(1); }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setStatusState('all');
    setCategoryState('all');
    setPage(1);
  }, []);

  return {
    debits,
    isInitialLoading,
    isFetching,
    error,
    searchInput,
    setSearchInput,
    status,
    setStatus,
    category,
    setCategory,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    refetch: fetchDebits,
    clearFilters,
    hasActiveFilters: Boolean(search) || status !== 'all' || category !== 'all',
  };
}
