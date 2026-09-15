'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as departmentsApi from '../api/departments.api';
import { toDepartmentList } from '../types/departments.mapper';
import type { Department } from '../types/departments.model';
import { messageOf } from '@/lib/api/errors';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS, type DepartmentStatusFilter } from '../constants/departments.constants';

export function useDepartmentList() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatusState] = useState<DepartmentStatusFilter>('all');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const inFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const fetchDepartments = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!hasLoadedRef.current) {
      setIsInitialLoading(true);
    }
    setIsFetching(true);
    setError('');
    try {
      const dto = await departmentsApi.listDepartments({ search, status, page, pageSize });
      const result = toDepartmentList(dto);
      setDepartments(result.departments);
      setTotal(result.total);
      setTotalPages(result.pages);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(messageOf(err));
    } finally {
      inFlightRef.current = false;
      setIsInitialLoading(false);
      setIsFetching(false);
    }
  }, [search, status, page, pageSize]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Debounced search settles into `search` (the value actually sent to the
  // server) and resets to page 1, mirroring the legacy page's behaviour.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const setStatus = useCallback((next: DepartmentStatusFilter) => {
    setStatusState(next);
    setPage(1);
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setStatusState('all');
    setPage(1);
  }, []);

  const updateDepartmentStatusLocally = useCallback((id: number, nextStatus: 'active' | 'inactive') => {
    setDepartments((prev) =>
      prev.map((dept) => (dept.id === id ? { ...dept, status: nextStatus } : dept))
    );
  }, []);

  return {
    departments,
    isLoading: isInitialLoading || isFetching,
    isInitialLoading,
    isFetching,
    error,
    searchInput,
    setSearchInput,
    status,
    setStatus,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    refetch: fetchDepartments,
    clearFilters,
    updateDepartmentStatusLocally,
    hasActiveFilters: Boolean(search) || status !== 'all',
  };
}
