'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/subOrganizations.api';
import { toSubOrganizationList } from '../types/sub-organizations.mapper';
import type { SubOrganization } from '../types/sub-organizations.model';
import { messageOf } from '../utils/asyncAction';
import {
  DEFAULT_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  type SubOrgStatusFilter,
} from '../constants/sub-organizations.constants';

export function useSubOrganizationList() {
  const [subOrganizations, setSubOrganizations] = useState<SubOrganization[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatusState] = useState<SubOrgStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const inFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const refetch = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.listSubOrganizations({ search, status, page, pageSize });
      const result = toSubOrganizationList(dto);
      setSubOrganizations(result.subOrganizations);
      setTotal(result.total);
      setPages(result.pages);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      inFlightRef.current = false;
      setIsFetching(false);
      hasLoadedRef.current = true;
      setIsInitialLoading(false);
    }
  }, [search, status, page, pageSize]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const setStatus = useCallback((next: SubOrgStatusFilter) => {
    setPage(1);
    setStatusState(next);
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPage(1);
    setPageSizeState(next);
  }, []);

  const updateStatusLocally = useCallback((id: number, status: SubOrganization['status']) => {
    setSubOrganizations((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setStatusState('all');
    setPage(1);
  }, []);

  return {
    subOrganizations,
    searchInput,
    setSearchInput,
    status,
    setStatus,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    pages,
    isInitialLoading,
    isFetching,
    error,
    hasActiveFilters: Boolean(search) || status !== 'all',
    clearFilters,
    updateStatusLocally,
    refetch,
  };
}
