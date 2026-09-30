'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/salaryRevisions.api';
import type { RevisionDto } from '@/features/compensation/types/compensation.dto';
import { messageOf } from '@/lib/api/errors';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS, type StatusFilter } from '../constants/salaryRevisions.constants';

export function useRevisionList() {
  const [revisions, setRevisions] = useState<RevisionDto[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatusState] = useState<StatusFilter>('all');
  const [type, setTypeState] = useState('');
  const [subOrgId, setSubOrgIdState] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const requestRef = useRef(0);

  const fetchRevisions = useCallback(async () => {
    const id = ++requestRef.current;
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.listRevisions({ search, status, type, subOrgId, page, pageSize });
      if (id !== requestRef.current) return;
      setRevisions(dto.revisions);
      setCounts(dto.counts || {});
      setTotal(dto.total);
      setTotalPages(dto.pages);
      if (dto.pages > 0 && page > dto.pages) setPage(dto.pages);
    } catch (err) {
      if (id === requestRef.current) setError(messageOf(err));
    } finally {
      if (id === requestRef.current) {
        setIsInitialLoading(false);
        setIsFetching(false);
      }
    }
  }, [search, status, type, subOrgId, page, pageSize]);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  useEffect(() => {
    const next = searchInput.trim();
    const t = setTimeout(() => {
      if (next === search) return;
      setSearch(next);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput, search]);

  const reset = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setStatusState('all');
    setTypeState('');
    setSubOrgIdState(null);
    setPage(1);
  }, []);

  return {
    revisions,
    counts,
    isInitialLoading,
    isFetching,
    error,
    searchInput,
    setSearchInput,
    status,
    setStatus: reset(setStatusState),
    type,
    setType: reset(setTypeState),
    subOrgId,
    setSubOrgId: reset(setSubOrgIdState),
    page,
    setPage,
    pageSize,
    setPageSize: reset(setPageSizeState),
    total,
    totalPages,
    refetch: fetchRevisions,
    clearFilters,
    hasActiveFilters: Boolean(search) || status !== 'all' || Boolean(type) || subOrgId !== null,
  };
}
