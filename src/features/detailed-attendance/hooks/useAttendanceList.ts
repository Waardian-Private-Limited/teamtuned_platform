'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { usePolling } from '@/lib/hooks/usePolling';
import type { FilterOptionsDto } from '@/features/attendance-dashboard/types/dashboard.dto';
import * as api from '../api/detailedAttendance.api';
import { PAGE_SIZE, REFRESH_MS, SEARCH_DEBOUNCE_MS } from '../constants/detailed.constants';
import { toList } from '../types/detailed.mapper';
import type { AttendanceList } from '../types/detailed.model';

export interface Filters {
  date: string;
  subOrgId: number | null;
  siteId: number | null;
  departmentId: number | null;
  roleId: number | null;
}

const EMPTY: Filters = { date: '', subOrgId: null, siteId: null, departmentId: null, roleId: null };

/**
 * The list screen's state: the filters and what they offer, the page of employees, and a refresh
 * every minute while looking at today. Choices that stop being offered (another sub-organisation
 * has other sites) are dropped, and every change goes back to page one.
 */
export function useAttendanceList() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [options, setOptions] = useState<FilterOptionsDto | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState<AttendanceList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.getFilterOptions(filters.subOrgId, filters.departmentId, controller.signal)
      .then((o) => {
        setOptions(o);
        setFilters((f) => {
          const next = { ...f, date: f.date || o.today };
          if (next.siteId && !o.sites.some((s) => s.id === next.siteId)) next.siteId = null;
          if (next.departmentId && !o.departments.some((d) => d.id === next.departmentId)) next.departmentId = null;
          if (next.roleId && !o.roles.some((r) => r.id === next.roleId)) next.roleId = null;
          return next;
        });
      })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); });
    return () => controller.abort();
  }, [filters.subOrgId, filters.departmentId]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const ready = !!filters.date;
  const isToday = !!options && filters.date === options.today;
  const key = `${JSON.stringify(filters)}|${search}|${page}|${nonce}`;

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    try {
      const dto = await api.listEmployees({ ...filters, search, page, pageSize: PAGE_SIZE }, signal);
      if (!signal.aborted) { setList(toList(dto)); setError(null); }
    } catch (e) {
      if (!signal.aborted) setError(messageOf(e));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  usePolling(load, isToday ? REFRESH_MS : 24 * 3600_000, ready, key);

  const update = useCallback((patch: Partial<Filters>) => {
    setFilters((f) => {
      const next = { ...f, ...patch };
      if ('subOrgId' in patch && patch.subOrgId !== f.subOrgId) Object.assign(next, { siteId: null, departmentId: null, roleId: null });
      if ('departmentId' in patch && patch.departmentId !== f.departmentId) next.roleId = null;
      return next;
    });
    setPage(1);
  }, []);

  const reset = useCallback(() => {
    setFilters((f) => ({ ...EMPTY, date: options?.today || f.date }));
    setSearchInput('');
    setSearch('');
    setPage(1);
  }, [options?.today]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const narrowed = useMemo(() => !!(filters.subOrgId || filters.siteId || filters.departmentId || filters.roleId || search), [filters, search]);

  return {
    filters, options, update, reset, reload, narrowed, isToday,
    searchInput, setSearchInput, page, setPage, pageSize: PAGE_SIZE,
    list, loading: loading && !list, refreshing: loading, error,
  };
}
