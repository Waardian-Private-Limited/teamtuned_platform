'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as employeeSitesApi from '../api/employeeSites.api';
import { toEmployeeSiteList } from '../types/employeeSites.mapper';
import type { EmployeeSiteRow, EmployeeSiteSummary } from '../types/employeeSites.model';
import { messageOf } from '@/lib/api/errors';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS, type SiteSegment } from '../constants/employeeSites.constants';

const EMPTY_SUMMARY: EmployeeSiteSummary = { total: 0, unassigned: 0, incharge: 0 };

export function useEmployeeSiteList() {
  const [employees, setEmployees] = useState<EmployeeSiteRow[]>([]);
  const [summary, setSummary] = useState<EmployeeSiteSummary>(EMPTY_SUMMARY);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [segment, setSegmentState] = useState<SiteSegment>('all');
  const [departmentId, setDepartmentIdState] = useState<number | null>(null);
  const [siteId, setSiteIdState] = useState<number | null>(null);
  const [subOrgId, setSubOrgIdState] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const hasLoadedRef = useRef(false);
  // Only the newest request may write state, so a slow response for an old
  // filter never overwrites a newer one.
  const requestIdRef = useRef(0);

  const fetchEmployees = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!hasLoadedRef.current) setIsInitialLoading(true);
    setIsFetching(true);
    setError('');
    try {
      const dto = await employeeSitesApi.listEmployeeSites({ search, segment, departmentId, siteId, subOrgId, page, pageSize });
      if (requestId !== requestIdRef.current) return;
      const result = toEmployeeSiteList(dto);
      setEmployees(result.employees);
      setSummary(result.summary);
      setTotal(result.total);
      setTotalPages(result.pages);
      hasLoadedRef.current = true;
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(messageOf(err));
    } finally {
      if (requestId === requestIdRef.current) {
        setIsInitialLoading(false);
        setIsFetching(false);
      }
    }
  }, [search, segment, departmentId, siteId, subOrgId, page, pageSize]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Debounced search settles into `search` (the value sent to the server)
  // and resets to page 1, mirroring the roles list hook.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const setSegment = useCallback((next: SiteSegment) => {
    setSegmentState(next);
    setPage(1);
  }, []);

  const setDepartmentId = useCallback((next: number | null) => {
    setDepartmentIdState(next);
    setPage(1);
  }, []);

  const setSiteId = useCallback((next: number | null) => {
    setSiteIdState(next);
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
    setSegmentState('all');
    setDepartmentIdState(null);
    setSiteIdState(null);
    setSubOrgIdState(null);
    setPage(1);
  }, []);

  return {
    employees,
    summary,
    isLoading: isInitialLoading || isFetching,
    isInitialLoading,
    isFetching,
    error,
    searchInput,
    setSearchInput,
    segment,
    setSegment,
    departmentId,
    setDepartmentId,
    siteId,
    setSiteId,
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
    hasActiveFilters: Boolean(search) || segment !== 'all' || Boolean(departmentId) || Boolean(siteId) || subOrgId !== null,
  };
}
