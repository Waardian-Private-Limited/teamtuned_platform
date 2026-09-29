'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as shiftTemplatesApi from '../api/shiftTemplates.api';
import { toShiftTemplateList } from '../types/shiftTemplates.mapper';
import type { ShiftTemplate, ShiftTemplateStatus } from '../types/shiftTemplates.model';
import { messageOf } from '@/lib/api/errors';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS, type ShiftStatusFilter } from '../constants/shiftTemplates.constants';

export function useShiftTemplateList() {
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatusState] = useState<ShiftStatusFilter>('all');
  const [subOrgId, setSubOrgIdState] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const inFlightRef = useRef(false);

  const fetchShifts = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsFetching(true);
    setError('');
    try {
      const dto = await shiftTemplatesApi.listShiftTemplates({ search, status, page, pageSize, subOrgId });
      const result = toShiftTemplateList(dto);
      setShifts(result.shifts);
      setTotal(result.total);
      setTotalPages(result.pages);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      inFlightRef.current = false;
      setIsInitialLoading(false);
      setIsFetching(false);
    }
  }, [search, status, page, pageSize, subOrgId]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const setStatus = useCallback((next: ShiftStatusFilter) => {
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

  const updateStatusLocally = useCallback((id: number, nextStatus: ShiftTemplateStatus) => {
    setShifts((prev) => prev.map((shift) => (shift.id === id ? { ...shift, status: nextStatus } : shift)));
  }, []);

  return {
    shifts,
    isInitialLoading,
    isFetching,
    error,
    searchInput,
    setSearchInput,
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
    refetch: fetchShifts,
    clearFilters,
    updateStatusLocally,
  };
}
