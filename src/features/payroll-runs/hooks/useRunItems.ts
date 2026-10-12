'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/payrollRuns.api';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../constants/payrollRuns.constants';
import { toItemPage } from '../types/payrollRuns.mapper';
import type { ItemFilters, ItemSortKey, PayItem } from '../types/payrollRuns.model';

const INITIAL: ItemFilters = { search: '', status: 'all', siteId: null, departmentId: null, sort: 'name', dir: 'asc' };

export function useRunItems(runId: number | null, version: number) {
  const [items, setItems] = useState<PayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<ItemFilters>(INITIAL);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const reqRef = useRef(0);
  const loadedRunRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (runId === null) {
      setItems([]);
      setLoading(false);
      return;
    }
    const req = ++reqRef.current;
    if (loadedRunRef.current === runId) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = toItemPage(await api.listItems(runId, filters, page, pageSize));
      if (req !== reqRef.current) return;
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      loadedRunRef.current = runId;
    } catch (err) {
      if (req === reqRef.current) setError(messageOf(err));
    } finally {
      if (req === reqRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [runId, filters, page, pageSize]);

  useEffect(() => {
    load();
  }, [load, version]);

  useEffect(() => {
    setPage(1);
  }, [runId]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput }));
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const update = useCallback((patch: Partial<ItemFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const toggleSort = useCallback((key: ItemSortKey) => {
    setFilters((f) => (f.sort === key ? { ...f, dir: f.dir === 'asc' ? 'desc' : 'asc' } : { ...f, sort: key, dir: key === 'name' ? 'asc' : 'desc' }));
    setPage(1);
  }, []);

  const clear = useCallback(() => {
    setSearchInput('');
    setFilters(INITIAL);
    setPage(1);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const narrowed = Boolean(filters.search) || filters.status !== 'all' || filters.siteId !== null || filters.departmentId !== null;

  return {
    items,
    loading,
    refreshing,
    error,
    searchInput,
    setSearchInput,
    filters,
    update,
    toggleSort,
    clear,
    narrowed,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    refresh: load,
  };
}
