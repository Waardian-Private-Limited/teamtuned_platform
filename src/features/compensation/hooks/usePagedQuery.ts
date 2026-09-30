'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';

interface PagedResult<T> {
  rows: T[];
  total: number;
  pages: number;
  counts?: Record<string, number>;
  extra?: Record<string, unknown>;
}

export function usePagedQuery<T>(
  loader: (params: { page: number; pageSize: number; search: string }) => Promise<PagedResult<T>>,
  deps: unknown[],
  { pageSize: initialSize = 20, debounceMs = 400 } = {}
) {
  const [rows, setRows] = useState<T[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [extra, setExtra] = useState<Record<string, unknown>>({});
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialSize);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const depKey = JSON.stringify(deps);
  const lastDep = useRef(depKey);

  const reload = useCallback(async () => {
    if (lastDep.current !== depKey) {
      lastDep.current = depKey;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }
    const id = ++request.current;
    setFetching(true);
    setError('');
    try {
      const res = await loaderRef.current({ page, pageSize, search });
      if (id !== request.current) return;
      setRows(res.rows);
      setTotal(res.total);
      setPages(res.pages);
      setCounts(res.counts || {});
      setExtra(res.extra || {});
      if (res.pages > 0 && page > res.pages) setPage(res.pages);
    } catch (err) {
      if (id === request.current) setError(messageOf(err));
    } finally {
      if (id === request.current) {
        setLoading(false);
        setFetching(false);
      }
    }
  }, [page, pageSize, search, depKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const next = searchInput.trim();
    const t = setTimeout(() => {
      if (next === search) return;
      setSearch(next);
      setPage(1);
    }, debounceMs);
    return () => clearTimeout(t);
  }, [searchInput, search, debounceMs]);

  const setPageSize = useCallback((n: number) => {
    setPageSizeState(n);
    setPage(1);
  }, []);

  return { rows, counts, extra, total, pages, page, setPage, pageSize, setPageSize, searchInput, setSearchInput, loading, fetching, error, reload, setRows };
}
