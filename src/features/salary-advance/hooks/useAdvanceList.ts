'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/salaryAdvance.api';
import { toAdvance } from '../types/salaryAdvance.mapper';
import type { Advance, AdvanceListFilters, AdvanceListTab, AdvanceSortKey } from '../types/salaryAdvance.model';
import { ADVANCE_TAB_VALUES, DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../constants/salaryAdvance.constants';

function initialTab(raw: string | null): AdvanceListTab {
  return raw && (ADVANCE_TAB_VALUES as string[]).includes(raw) ? (raw as AdvanceListTab) : 'pending';
}

function initialId(raw: string | null): number | null {
  const n = Number(raw);
  return raw && Number.isInteger(n) && n > 0 ? n : null;
}

export function useAdvanceList() {
  const params = useSearchParams();
  const [filters, setFilters] = useState<AdvanceListFilters>(() => ({
    tab: initialTab(params.get('status')),
    typeId: initialId(params.get('type')),
    siteId: null,
    departmentId: null,
    search: '',
    subOrgId: initialId(params.get('subOrgId')),
    sort: { key: 'created_at', dir: 'desc' },
  }));
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);

  const [rows, setRows] = useState<Advance[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.listAdvances({
        status: filters.tab,
        type: filters.typeId,
        search: filters.search,
        siteId: filters.siteId,
        departmentId: filters.departmentId,
        subOrgId: filters.subOrgId,
        page,
        pageSize,
        sort: filters.sort.dir === 'desc' ? `-${filters.sort.key}` : filters.sort.key,
      });
      if (id !== request.current) return;
      setRows((dto.items || []).map(toAdvance));
      setTotal(Number(dto.total) || 0);
      setCounts(dto.counts || {});
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

  const update = useCallback((patch: Partial<AdvanceListFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const toggleSort = useCallback((key: AdvanceSortKey) => {
    setFilters((f) => ({
      ...f,
      sort: f.sort.key === key ? { key, dir: f.sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'status' ? 'asc' : 'desc' },
    }));
    setPage(1);
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setFilters((f) => ({ ...f, typeId: null, siteId: null, departmentId: null, search: '' }));
    setPage(1);
  }, []);

  return {
    filters,
    update,
    toggleSort,
    searchInput,
    setSearchInput,
    rows,
    total,
    counts,
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
    hasActiveFilters: Boolean(filters.search || filters.typeId || filters.siteId || filters.departmentId),
  };
}
