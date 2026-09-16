'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as rolesApi from '../api/roles.api';
import { toRoleList } from '../types/roles.mapper';
import type { Role } from '../types/roles.model';
import { messageOf } from '@/lib/api/errors';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS, type RoleStatusFilter } from '../constants/roles.constants';

export function useRoleList() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatusState] = useState<RoleStatusFilter>('all');
  const [departmentId, setDepartmentIdState] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const inFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const fetchRoles = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!hasLoadedRef.current) {
      setIsInitialLoading(true);
    }
    setIsFetching(true);
    setError('');
    try {
      const dto = await rolesApi.listRoles({ search, status, departmentId, page, pageSize });
      const result = toRoleList(dto);
      setRoles(result.roles);
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
  }, [search, status, departmentId, page, pageSize]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Debounced search settles into `search` (the value actually sent to the
  // server) and resets to page 1, mirroring the departments list hook.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const setStatus = useCallback((next: RoleStatusFilter) => {
    setStatusState(next);
    setPage(1);
  }, []);

  const setDepartmentId = useCallback((next: number | null) => {
    setDepartmentIdState(next);
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
    setDepartmentIdState(null);
    setPage(1);
  }, []);

  const updateRoleStatusLocally = useCallback((id: number, nextStatus: 'active' | 'inactive') => {
    setRoles((prev) => prev.map((role) => (role.id === id ? { ...role, status: nextStatus } : role)));
  }, []);

  return {
    roles,
    isLoading: isInitialLoading || isFetching,
    isInitialLoading,
    isFetching,
    error,
    searchInput,
    setSearchInput,
    status,
    setStatus,
    departmentId,
    setDepartmentId,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    refetch: fetchRoles,
    clearFilters,
    updateRoleStatusLocally,
    hasActiveFilters: Boolean(search) || status !== 'all' || Boolean(departmentId),
  };
}
