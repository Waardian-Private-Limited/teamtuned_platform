'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/myLeave.api';
import { DEFAULT_PAGE_SIZE } from '../constants/leave.constants';
import { toRequestsPage } from '../types/leave.mapper';
import type { RequestFilters, RequestsPage } from '../types/leave.model';

const initial = (): RequestFilters => ({ status: null, typeId: null, from: '', to: '' });

/**
 * The employee's own leave requests, newest first, a page at a time, filtered by status, leave type
 * and dates. A filter change goes back to page 1; an older answer never replaces a newer one.
 */
export function useLeaveRequests(reloadKey: number) {
  const [filters, setFilters] = useState<RequestFilters>(initial);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<RequestsPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setFetching(true);
    api.listRequests(filters, page, pageSize, controller.signal)
      .then((dto) => { setData(toRequestsPage(dto)); setError(null); loaded.current = true; })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!controller.signal.aborted) setFetching(false); });
    return () => controller.abort();
  }, [filters, page, pageSize, reloadKey]);

  const update = useCallback(<K extends keyof RequestFilters>(key: K, value: RequestFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }, []);
  const clear = useCallback(() => { setFilters(initial()); setPage(1); }, []);
  const setPageSize = useCallback((size: number) => { setPageSizeState(size); setPage(1); }, []);

  const defaults = initial();
  const filtered = (Object.keys(defaults) as Array<keyof RequestFilters>).some((k) => filters[k] !== defaults[k]);

  return { filters, update, clear, filtered, page, setPage, pageSize, setPageSize, data, error, fetching, loading: !loaded.current && !error };
}
