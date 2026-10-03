'use client';

import { useCallback, useEffect, useState } from 'react';
import { showError } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/onboarding-review.api';
import type { SubmissionListItemDto } from '../types/onboarding-review.dto';

const SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_PAGE_SIZE = 10;

export function useSubmissionList(initialStatus: string) {
  const [rows, setRows] = useState<SubmissionListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [status, setStatusState] = useState(initialStatus);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let alive = true;
    setIsFetching(true);
    api
      .listSubmissions({ status, search, page, pageSize })
      .then((res) => {
        if (!alive) return;
        setRows(res.submissions);
        setTotal(res.total);
        setTotalPages(res.pages);
        if (res.pages > 0 && page > res.pages) setPage(res.pages);
      })
      .catch((e) => alive && showError(messageOf(e)))
      .finally(() => {
        if (!alive) return;
        setLoading(false);
        setIsFetching(false);
      });
    return () => {
      alive = false;
    };
  }, [status, search, page, pageSize]);

  const setStatus = useCallback((next: string) => {
    setStatusState(next);
    setPage(1);
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setStatusState('');
    setPage(1);
  }, []);

  return {
    rows, loading, isFetching,
    status, setStatus,
    searchInput, setSearchInput, search,
    page, setPage, pageSize, setPageSize, total, totalPages,
    clearFilters,
  };
}
