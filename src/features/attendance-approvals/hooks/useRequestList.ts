'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/attendanceApprovals.api';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../constants/review.constants';
import { toReviewPage } from '../types/review.mapper';
import type { RequestRow, ReviewFilters } from '../types/review.model';

const initialFilters = (): ReviewFilters => ({
  status: 'waiting',
  siteId: null, departmentId: null, roleId: null, from: '', to: '', search: '', sort: 'submitted_desc',
});

/**
 * A filtered, sorted page of the regularization requests the signed-in reviewer is part of. Any filter
 * change goes back to page 1; the search waits for typing to settle; the answer to an older query
 * never replaces the answer to a newer one.
 */
export function useRequestList() {
  const [filters, setFilters] = useState<ReviewFilters>(initialFilters);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const loaded = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.search === searchInput.trim() ? f : { ...f, search: searchInput.trim() }));
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setFetching(true);
    api.listReview(filters, page, pageSize, controller.signal).then(toReviewPage)
      .then((p) => { setRows(p.rows); setTotal(p.total); setError(null); loaded.current = true; })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!controller.signal.aborted) { setFetching(false); setLoading(false); } });
    return () => controller.abort();
  }, [filters, page, pageSize, nonce]);

  const update = useCallback(<K extends keyof ReviewFilters>(key: K, value: ReviewFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: value, ...(key === 'departmentId' ? { roleId: null } : {}) }));
    setPage(1);
  }, []);

  const clear = useCallback(() => {
    setFilters(initialFilters());
    setSearchInput('');
    setPage(1);
  }, []);

  const setPageSize = useCallback((size: number) => { setPageSizeState(size); setPage(1); }, []);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const defaults = initialFilters();
  const filtered = (Object.keys(defaults) as Array<keyof ReviewFilters>).some((k) => k !== 'sort' && filters[k] !== defaults[k]) || searchInput.trim() !== '';

  return {
    filters, update, clear, filtered, searchInput, setSearchInput,
    rows, total, page, setPage, pageSize, setPageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)),
    loading: loading && !loaded.current, fetching, error, reload,
  };
}
