'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf, statusOf } from '@/lib/api/errors';
import * as api from '../../shared/api/recruitment.api';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../../shared/constants/recruitment.constants';
import { toApplicationCard, toPaged } from '../../shared/types/recruitment.mapper';
import type { ApplicationCard } from '../../shared/types/recruitment.model';

export interface ApplicationFilters {
  positionId: number | null;
  stage: string;
  status: string;
  source: string;
  ownerMe: boolean;
}

export const DEFAULT_FILTERS: ApplicationFilters = { positionId: null, stage: '', status: 'active', source: '', ownerMe: false };

/** Cross-position applications, server-paged. Status defaults to active. */
export function useApplicationList(initial: Partial<ApplicationFilters> = {}) {
  const [items, setItems] = useState<ApplicationCard[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFiltersState] = useState<ApplicationFilters>({ ...DEFAULT_FILTERS, ...initial });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const fetchList = useCallback(async () => {
    if (inFlightRef.current) { queuedRef.current = true; return; }
    inFlightRef.current = true;
    if (!hasLoadedRef.current) setIsInitialLoading(true);
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.listApplications({ search, ...filters, page, pageSize });
      const r = toPaged(dto, toApplicationCard);
      setItems(r.items);
      setTotal(r.total);
      setTotalPages(r.pages);
      setForbidden(false);
      hasLoadedRef.current = true;
    } catch (err) {
      if (statusOf(err) === 403) setForbidden(true);
      else setError(messageOf(err));
    } finally {
      inFlightRef.current = false;
      setIsInitialLoading(false);
      setIsFetching(false);
    }
  }, [search, filters, page, pageSize]);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => {
    if (!isFetching && queuedRef.current) { queuedRef.current = false; fetchList(); }
  }, [isFetching, fetchList]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput); }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const setFilter = useCallback(<K extends keyof ApplicationFilters>(key: K, value: ApplicationFilters[K]) => {
    setFiltersState((f) => ({ ...f, [key]: value }));
    setPage(1);
  }, []);
  const setPageSize = useCallback((n: number) => { setPageSizeState(n); setPage(1); }, []);
  const clearFilters = useCallback(() => { setSearchInput(''); setSearch(''); setFiltersState(DEFAULT_FILTERS); setPage(1); }, []);

  const hasActiveFilters = Boolean(search) || filters.positionId !== null || Boolean(filters.stage) || filters.status !== 'active' || Boolean(filters.source) || filters.ownerMe;

  return {
    items, isInitialLoading, isFetching, error, forbidden,
    searchInput, setSearchInput, filters, setFilter, clearFilters, hasActiveFilters,
    page, setPage, pageSize, setPageSize, total, totalPages, refetch: fetchList,
  };
}
