'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../constants/labour.constants';
import type { Paged } from '../types/labour.types';

/**
 * A server-paginated list with filters. Filters are an object the page owns; `search` is debounced
 * through `searchInput` so typing does not fire a request per key.
 */
export function usePagedList<T, F extends Record<string, unknown> & { search?: string }>(
  fetcher: (filters: F, page: number, pageSize: number) => Promise<Paged<T>>,
  initial: F,
  options: { enabled?: boolean; pageSize?: number } = {}
) {
  const { enabled = true } = options;
  const [filters, setFilters] = useState<F>(initial);
  const [searchInput, setSearchInput] = useState(initial.search || '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(options.pageSize || DEFAULT_PAGE_SIZE);
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const initialRef = useRef(initial);

  const load = useCallback(async () => {
    const id = ++request.current;
    setFetching(true);
    setError('');
    try {
      const res = await fetcherRef.current(filters, page, pageSize);
      if (id !== request.current) return;
      setRows(res.items || []);
      setTotal(Number(res.total) || 0);
    } catch (err) {
      if (id !== request.current) return;
      setRows([]);
      setTotal(0);
      setError(messageOf(err));
    } finally {
      if (id === request.current) {
        setFetching(false);
        setInitialLoading(false);
      }
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    if (enabled) load();
  }, [load, enabled]);

  const applied = useRef(initial.search || '');
  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchInput.trim();
      if (next === applied.current) return;
      applied.current = next;
      setFilters((f) => ({ ...f, search: next }));
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const update = useCallback((patch: Partial<F>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);
  const setPageSize = useCallback((n: number) => {
    setPageSizeState(n);
    setPage(1);
  }, []);
  const clear = useCallback(() => {
    setSearchInput('');
    applied.current = '';
    setFilters({ ...initialRef.current, search: '' });
    setPage(1);
  }, []);

  const base = initialRef.current;
  const hasActiveFilters = Object.keys(filters).some((k) => filters[k] !== base[k] && (filters[k] || base[k]));

  return {
    filters, update, searchInput, setSearchInput, rows, total, page, setPage, pageSize, setPageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)), initialLoading, fetching, error, refetch: load, clear, hasActiveFilters,
  };
}
