'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as employeesApi from '../api/employees.api';
import type { EmployeeListItemDto, EmployeeListResponseDto, EmployeeStatus } from '../types/employees.dto';
import { messageOf } from '@/lib/api/errors';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS, type StatusFilter } from '../constants/employees.constants';

const EMPTY_COUNTS: EmployeeListResponseDto['counts'] = { all: 0, Active: 0, Invited: 0, Inactive: 0, Terminated: 0 };

export function useEmployeeList() {
  const [employees, setEmployees] = useState<EmployeeListItemDto[]>([]);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatusState] = useState<StatusFilter>('all');
  const [subOrgId, setSubOrgIdState] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const requestRef = useRef(0);

  const fetchEmployees = useCallback(async () => {
    const requestId = ++requestRef.current;
    setIsFetching(true);
    setError('');
    try {
      const dto = await employeesApi.listEmployees({ search, status, page, pageSize, subOrgId });
      if (requestId !== requestRef.current) return;
      setEmployees(dto.employees);
      setCounts(dto.counts || EMPTY_COUNTS);
      setTotal(dto.total);
      setTotalPages(dto.pages);
      if (dto.pages > 0 && page > dto.pages) setPage(dto.pages);
    } catch (err) {
      if (requestId === requestRef.current) setError(messageOf(err));
    } finally {
      if (requestId === requestRef.current) {
        setIsInitialLoading(false);
        setIsFetching(false);
      }
    }
  }, [search, status, page, pageSize, subOrgId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    const next = searchInput.trim();
    const timeout = setTimeout(() => {
      if (next === search) return;
      setSearch(next);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput, search]);

  const setStatus = useCallback((next: StatusFilter) => {
    setStatusState(next);
    setPage(1);
  }, []);

  const setSubOrgId = useCallback((next: number | null) => {
    setSubOrgIdState(next);
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
    setSubOrgIdState(null);
    setPage(1);
  }, []);

  const patchLocally = useCallback((id: number, nextStatus: EmployeeStatus) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, status: nextStatus } : e)));
  }, []);

  return {
    employees,
    counts,
    isInitialLoading,
    isFetching,
    error,
    searchInput,
    setSearchInput,
    search,
    status,
    setStatus,
    subOrgId,
    setSubOrgId,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    refetch: fetchEmployees,
    clearFilters,
    patchLocally,
    hasActiveFilters: Boolean(search) || status !== 'all' || subOrgId !== null,
  };
}
