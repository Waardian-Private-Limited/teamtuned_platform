'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/attendanceApprovals.api';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../constants/review.constants';
import { toReviewPage } from '../types/review.mapper';
import type { RequestRow, RequestType, ReviewFilters, ReviewScope, RowPage } from '../types/review.model';

const initialFilters = (): ReviewFilters => ({
  status: null,
  siteId: null, departmentId: null, from: '', to: '', search: '',
});

/**
 * A filtered page (newest first) of one type of attendance request: the ones assigned to the signed-in reviewer, or
 * (`scope` all, for those the server lets follow) every one in their reach. Any filter change goes back
 * to page 1; the search waits for typing to settle; the answer to an older query never replaces the
 * answer to a newer one.
 */
export function useRequestList(type: RequestType) {
  // Null until the person picks one: the server starts those who may follow everything on "all".
  const [chosenScope, setChosenScope] = useState<ReviewScope | null>(null);
  const [applied, setApplied] = useState<{ scope: ReviewScope; status: ReviewFilters['status'] }>({ scope: 'assigned', status: 'waiting' });
  const [filters, setFilters] = useState<ReviewFilters>(initialFilters);
  const [counts, setCounts] = useState<RowPage['counts']>({});
  const [access, setAccess] = useState<RowPage['access']>({ canTrack: false, allSites: false });
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
    api.listReview(type, chosenScope, filters, page, pageSize, controller.signal).then(toReviewPage)
      .then((p) => { setRows(p.rows); setTotal(p.total); setCounts(p.counts); setAccess(p.access); setApplied({ scope: p.scope, status: p.status }); setError(null); loaded.current = true; })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!controller.signal.aborted) { setFetching(false); setLoading(false); } });
    return () => controller.abort();
  }, [type, chosenScope, filters, page, pageSize, nonce]);

  const update = useCallback(<K extends keyof ReviewFilters>(key: K, value: ReviewFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }, []);

  const clear = useCallback(() => {
    setFilters(initialFilters());
    setSearchInput('');
    setPage(1);
  }, []);

  /** Switching between assigned and all keeps the other filters; only the status starts again. */
  const setScope = useCallback((next: ReviewScope) => {
    setChosenScope(next);
    setFilters((f) => ({ ...f, status: null }));
    setPage(1);
  }, []);

  const setPageSize = useCallback((size: number) => { setPageSizeState(size); setPage(1); }, []);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const defaults = initialFilters();
  const filtered = (Object.keys(defaults) as Array<keyof ReviewFilters>).some((k) => filters[k] !== defaults[k]) || searchInput.trim() !== '';

  return {
    scope: chosenScope ?? applied.scope, setScope, counts, access,
    // The status on screen is what the server applied when none was picked.
    filters: { ...filters, status: filters.status ?? applied.status }, update, clear, filtered, searchInput, setSearchInput,
    rows, total, page, setPage, pageSize, setPageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)),
    loading: loading && !loaded.current, fetching, error, reload,
  };
}
