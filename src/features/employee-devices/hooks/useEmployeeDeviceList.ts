'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/employeeDevices.api';
import { toEmployeeDeviceList } from '../types/employeeDevices.mapper';
import type { DeviceSummary, EmployeeDevice } from '../types/employeeDevices.model';
import { messageOf } from '@/lib/api/errors';
import {
  DEFAULT_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  type DevicePlatformFilter,
  type DeviceStatusFilter,
} from '../constants/employeeDevices.constants';

const EMPTY_SUMMARY: DeviceSummary = { registered: 0, pending: 0, none: 0 };

export function useEmployeeDeviceList() {
  const [employees, setEmployees] = useState<EmployeeDevice[]>([]);
  const [summary, setSummary] = useState<DeviceSummary>(EMPTY_SUMMARY);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatusState] = useState<DeviceStatusFilter>('all');
  const [platform, setPlatformState] = useState<DevicePlatformFilter>('all');
  const [subOrgId, setSubOrgIdState] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Only the latest request may write state, so a slow response for an old
  // filter never overwrites a newer one.
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const fetchList = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!hasLoadedRef.current) setIsInitialLoading(true);
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.listEmployeeDevices({ search, status, platform, page, pageSize, subOrgId });
      if (requestId !== requestIdRef.current) return;
      const result = toEmployeeDeviceList(dto);
      setEmployees(result.employees);
      setSummary(result.summary);
      setTotal(result.total);
      setTotalPages(result.pages);
      hasLoadedRef.current = true;
    } catch (err) {
      if (requestId === requestIdRef.current) setError(messageOf(err));
    } finally {
      if (requestId === requestIdRef.current) {
        setIsInitialLoading(false);
        setIsFetching(false);
      }
    }
  }, [search, status, platform, page, pageSize, subOrgId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Debounced search settles into `search` (what is sent) and goes back to page 1.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const setStatus = useCallback((next: DeviceStatusFilter) => {
    setStatusState(next);
    setPage(1);
  }, []);

  const setPlatform = useCallback((next: DevicePlatformFilter) => {
    setPlatformState(next);
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
    setPlatformState('all');
    setSubOrgIdState(null);
    setPage(1);
  }, []);

  return {
    employees,
    summary,
    isInitialLoading,
    isFetching,
    error,
    searchInput,
    setSearchInput,
    search,
    status,
    setStatus,
    platform,
    setPlatform,
    subOrgId,
    setSubOrgId,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    refetch: fetchList,
    clearFilters,
    hasActiveFilters: Boolean(search) || status !== 'all' || platform !== 'all' || subOrgId !== null,
  };
}
